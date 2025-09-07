CREATE TABLE fund_quota (
  id           SERIAL      PRIMARY KEY,
  fund_company TEXT        NOT NULL,
  fund_name    TEXT        NOT NULL,
  share_class  TEXT        NOT NULL,
  fund_code    VARCHAR(20) NOT NULL,
  quota        INTEGER     NOT NULL,
  currency     CHAR(3)     NOT NULL
);