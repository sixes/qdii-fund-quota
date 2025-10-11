import requests
import json
import urllib.parse
from datetime import datetime, timedelta
from bs4 import BeautifulSoup
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import re
import logging
import time
import smtplib
import traceback
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# === Load Environment Variables ===
load_dotenv()

# === Setup Logging ===
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("fund_scraper.log", encoding="utf-8"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# === Configuration ===
base_url = "http://eid.csrc.gov.cn/fund/disclose/advanced_search_xbrl.do"
view_base_url = "http://eid.csrc.gov.cn/fund/disclose/instance_html_view.do"

# Date range: last 8 days
start_upload_date = (datetime.now() - timedelta(days=0)).strftime("%Y-%m-%d")
end_upload_date = datetime.now().strftime("%Y-%m-%d")

# === Helper: Safe text extraction from <td> ===
def get_text_from_td(td):
    if not td:
        return "N/A"
    if isinstance(td, str):
        return td
    p_tag = td.find("p")
    if p_tag:
        return p_tag.get_text(strip=True)
    return td.get_text(strip=True)

# === Upsert record into PostgreSQL ===
def upsert_record(conn, fund_code, fund_name, fund_company, quota, begin_date, upload_info_id):
    try:
        # Validate fund_code
        if not (isinstance(fund_code, str) and len(fund_code) == 6 and fund_code.isdigit()):
            logger.error(f"Invalid fund code: {fund_code}")
            return False, f"Invalid fund code: {fund_code}"

        # Parse quota
        try:
            quota_val = float(quota.replace(",", "")) if quota not in ["N/A", "-", ""] else 0.0
        except Exception as e:
            logger.error(f"Failed to parse quota '{quota}' for fund {fund_code}: {e}")
            quota_val = 0.0

        # Validate date
        try:
            datetime.strptime(begin_date, "%Y-%m-%d")
        except ValueError as e:
            logger.error(f"Invalid date format: {begin_date} for fund {fund_code}")
            return False, f"Invalid date: {begin_date}"

        # Clean fund name
        fund_company = fund_company.replace('基金管理有限公司', '')
        fund_company = fund_company.replace('基金管理股份有限公司', '')
        fund_company = fund_company.replace('基金管理有限责任公司', '')
        fund_company = fund_company.replace('基金管理有限责任公司', '')
        fund_company = fund_company.replace('基金管理（中国）有限公司', '')
        cleaned_name = fund_name.strip()
        cleaned_name = re.sub(r'\(?(QDII|LOF|ETF|REIT|DAX|CAC40|FOF)\)?', '', cleaned_name)
        cleaned_name = cleaned_name.replace('美元债', '').replace('美元债券', '').replace('美元收益债券', '')

        # Detect currency
        currency = 'CNY'
        usd_descs = ['美元', '美汇', '美钞']
        for desc in usd_descs:
            if desc in cleaned_name:
                currency = 'USD'
                break

        # Extract single uppercase letter (A, C, E, etc.) from name
        share_class_match = re.search(r'([A-Z])', cleaned_name)
        share_class = share_class_match.group(1) if share_class_match else 'N/A'

        # Execute upsert
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO fund_quota (
                    fund_code, fund_name, fund_company, share_class, quota,
                    currency, pdf_id, otc, effective_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, '场外', %s)
                ON CONFLICT (fund_name) DO UPDATE SET
                    fund_company = EXCLUDED.fund_company,
                    share_class = EXCLUDED.share_class,
                    quota = EXCLUDED.quota,
                    currency = EXCLUDED.currency,
                    pdf_id = EXCLUDED.pdf_id,
                    otc = EXCLUDED.otc,
                    effective_date = EXCLUDED.effective_date
                WHERE EXCLUDED.effective_date >= fund_quota.effective_date;
            """, (
                fund_code, fund_name, fund_company, share_class,
                quota_val, currency, upload_info_id, begin_date
            ))
        return True, None

    except Exception as e:
        logger.error(f"Database upsert failed for {fund_code}: {e}", exc_info=True)
        return False, str(e)

# === Ping Healthchecks.io ===
def ping_healthchecks(status: str = "ok"):
    """Ping healthchecks.io to log run status"""
    try:
        hc_url = os.getenv("HEALTHCHECKS_URL")
        if not hc_url:
            logger.warning("HEALTHCHECKS_URL not set, skipping health ping.")
            return

        url = hc_url if status == "ok" else f"{hc_url}/fail"
        requests.get(url, timeout=5)
        logger.debug(f"Healthchecks.io pinged: {status}")
    except Exception as e:
        logger.warning(f"Failed to ping healthchecks.io: {e}")

# === Send Alert Email via Gmail ===
def send_alert_email(subject: str, body: str):
    """Send email via Gmail using app password"""
    try:
        user = os.getenv("GMAIL_USER")
        password = os.getenv("GMAIL_APP_PASSWORD")
        recipient = os.getenv("ALERT_EMAIL", user)

        if not all([user, password]):
            logger.warning("Gmail credentials missing, cannot send email.")
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = user
        msg["To"] = recipient

        part = MIMEText(body, "plain", "utf-8")
        msg.attach(part)

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(user, password)
        server.sendmail(user, recipient, msg.as_string())
        server.quit()

        logger.info(f"📧 Alert email sent to {recipient}")
    except Exception as e:
        logger.error(f"❌ Failed to send email: {e}", exc_info=True)

# === Fetch All Announcements with Retry Logic (Exponential Backoff) ===
def fetch_all_announcements():
    all_data = []
    display_length = 20
    start = 0
    total_records = None
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    }

    logger.info("🔍 Fetching announcements with pagination...")

    while total_records is None or start < total_records:
        max_retries = 5
        retry_count = 0
        page_data = None
        current_url = None

        while retry_count < max_retries and page_data is None:
            if retry_count > 0:
                # Exponential backoff: 2^retry seconds
                wait_time = 2 ** retry_count * 5  # 5, 10, 20, 40, 80 seconds
                logger.warning(f"🔁 Retrying... (attempt {retry_count + 1}/{max_retries}) for start={start}, waiting {wait_time}s")
                time.sleep(wait_time)

            try:
                aoData = [
                    {"name": "sEcho", "value": 1},
                    {"name": "iColumns", "value": 7},
                    {"name": "sColumns", "value": ",,,,,,"},
                    {"name": "iDisplayStart", "value": start},
                    {"name": "iDisplayLength", "value": display_length},
                    {"name": "mDataProp_0", "value": "fundCode"},
                    {"name": "mDataProp_1", "value": "classificationCode"},
                    {"name": "mDataProp_2", "value": "fundId"},
                    {"name": "mDataProp_3", "value": "organName"},
                    {"name": "mDataProp_4", "value": "reportDesp"},
                    {"name": "mDataProp_5", "value": "reportSendDate"},
                    {"name": "mDataProp_6", "value": "uploadInfoId"},
                    {"name": "fundType", "value": "6020-6050"},
                    {"name": "reportTypeCode", "value": "FC190"},
                    {"name": "reportYear", "value": ""},
                    {"name": "fundCompanyShortName", "value": ""},
                    {"name": "fundCode", "value": ""},
                    {"name": "fundShortName", "value": ""},
                    {"name": "startUploadDate", "value": start_upload_date},
                    {"name": "endUploadDate", "value": end_upload_date},
                ]
                aoData_json = json.dumps(aoData, separators=(',', ':'))
                aoData_encoded = urllib.parse.quote(aoData_json)
                current_url = f"{base_url}?aoData={aoData_encoded}&_={int(datetime.now().timestamp() * 1000)}"

                response = requests.get(current_url, headers=headers, timeout=10)
                if response.status_code != 200:
                    logger.warning(f"HTTP {response.status_code} at start={start}")
                    retry_count += 1
                    continue

                data = response.json()

                if not data.get("success", True):
                    msg = data.get("message", "Unknown error")
                    logger.error(f"API error at start={start}: {msg}")
                    retry_count += 1
                    continue

                if total_records is None:
                    total_records = data.get("iTotalRecords", 0)
                    logger.info(f"📊 Total announcements found: {total_records}")

                page_data = data.get("aaData", [])
                if not page_data:
                    logger.info(f"📭 No data for start={start}, assuming end of results.")
                    break

                all_data.extend(page_data)
                logger.debug(f"Fetched {len(page_data)} records (start={start})")
                start += display_length

            except requests.exceptions.Timeout:
                logger.warning(f"Timeout at start={start}")
                retry_count += 1
            except requests.exceptions.RequestException as e:
                logger.error(f"Request error at start={start}: {e}")
                retry_count += 1
            except Exception as e:
                logger.error(f"Unexpected error at start={start}: {e}", exc_info=True)
                retry_count += 1

        if page_data is None:
            logger.critical(f"❌ Failed to fetch data for start={start} after {max_retries} retries.")
            break
        
        time.sleep(0.5)

    logger.info(f"🎉 Fetched {len(all_data)} announcement(s). API reported {total_records} total.")
    return all_data, total_records

# === Main Execution ===
if __name__ == "__main__":
    success_count = 0
    failed_count = 0
    holiday_count = 0
    announcements = []
    total_expected = 0

    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        logger.critical("DATABASE_URL not found in .env file")
        ping_healthchecks("fail")
        exit(1)

    try:
        # Use context manager for DB connection
        with psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor) as conn:
            logger.info("✅ Database connected")

            # Fetch announcements
            announcements, total_expected = fetch_all_announcements()
            logger.info(f"Processing {len(announcements)} announcements...")

            for item in announcements:
                upload_info_id = item["uploadInfoId"]
                fund_code = item["fundCode"]
                fund_name = item["fundShortName"]
                report_desc = item["reportDesp"]

                if "暂停" not in report_desc:
                    continue  # Skip non-suspension

                try:
                    html_url = f"{view_base_url}?instanceid={upload_info_id}"
                    html_response = requests.get(
                        html_url,
                        headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                        timeout=10
                    )
                    if html_response.status_code != 200:
                        logger.error(f"❌ Failed to fetch HTML: {html_url} (status: {html_response.status_code})")
                        failed_count += 1
                        continue

                    soup = BeautifulSoup(html_response.text, 'html.parser')
                    container = soup.find("div", id="con_one_1")
                    table = container.find("table") if container else None
                    rows = table.find_all("tr", class_="dd") if table else []

                    if len(rows) < 3:
                        logger.error(f"❌ Insufficient rows in table: {html_url}")
                        failed_count += 1
                        continue

                    # Extract key rows
                    company_row = None
                    date_row = None
                    name_row = None
                    code_row = None
                    quota_row = None

                    for row in rows:
                        first_cell = row.find("td")
                        if not first_cell:
                            continue
                        text = first_cell.get_text(strip=True)
                        if "基金管理人名称" in text:
                            company_row = row
                        elif "暂停大额申购起始日" in text:
                            date_row = row
                        elif "下属分级基金的基金简称" in text:
                            name_row = row
                        elif "下属分级基金的交易代码" in text:
                            code_row = row
                        elif "限制申购金额" in text:
                            quota_row = row

                    if not name_row:
                        holiday_count += 1
                        continue

                    if not company_row or not date_row:
                        logger.error(f"❌ Missing company or date row: {html_url}")
                        failed_count += 1
                        continue

                    company_name = get_text_from_td(company_row.find_all("td")[1:][0])
                    begin_date = get_text_from_td(date_row.find_all("td")[1:][0])

                    if begin_date == "-":
                        holiday_count += 1
                        continue

                    try:
                        datetime.strptime(begin_date, "%Y-%m-%d")
                    except ValueError:
                        logger.error(f"❌ Invalid date format: {begin_date} - URL: {html_url}", exc_info=True)
                        failed_count += 1
                        continue

                    name_tds = name_row.find_all("td")[1:]
                    code_tds = code_row.find_all("td")[1:] if code_row else [None] * len(name_tds)
                    quota_tds = quota_row.find_all("td")[1:] if quota_row else [None] * len(name_tds)

                    for i in range(len(name_tds)):
                        name = get_text_from_td(name_tds[i])
                        code = get_text_from_td(code_tds[i]) if i < len(code_tds) else "N/A"
                        quota = get_text_from_td(quota_tds[i]) if i < len(quota_tds) else "N/A"

                        if code == "N/A":
                            logger.debug(f"Missing code for fund: {name}")
                            continue

                        # Clean code
                        code = ''.join(c for c in code if c.isdigit())
                        if len(code) != 6:
                            logger.error(f"Invalid fund code length after cleaning: {code}")
                            continue

                        ok, msg = upsert_record(conn, code, name, company_name, quota, begin_date, upload_info_id)
                        if ok:
                            success_count += 1
                        else:
                            failed_count += 1

                    time.sleep(0.5)
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Error processing {html_url}: {e}", exc_info=True)

            # Commit is automatic with `with` block if no exception
            logger.info(f"✅ Sync completed. Success: {success_count}, Holiday skipped: {holiday_count}, Failed: {failed_count}")

            # Alert if incomplete or failed
            if len(announcements) < total_expected or failed_count > 0:
                subject = "⚠️ Fund Scraper Alert: Incomplete Data or Failures"
                body = f"""
Fund Scraper completed with issues.

Summary:
- Total fetched: {len(announcements)}
- Expected: {total_expected}
- Success: {success_count}
- Failed: {failed_count}
- Holiday skipped: {holiday_count}

Note: fetched < expected or failed > 0 → potential data loss.

Check logs for details.
"""
                send_alert_email(subject, body)

            ping_healthchecks("ok")

    except Exception as e:
        logger.critical(f"❌ Critical error: {e}", exc_info=True)
        ping_healthchecks("fail")

        subject = "🚨 Fund Scraper CRITICAL FAILURE"
        body = f"""
The fund scraper crashed with a critical error.

Error: {e}

Traceback:
{traceback.format_exc()}

Check immediately.
"""
        send_alert_email(subject, body)

        exit(1)

