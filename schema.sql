DROP VIEW IF EXISTS transaction_uah;
DROP TABLE IF EXISTS "exchange_rate";
DROP SEQUENCE IF EXISTS exchange_rate_id_seq;
CREATE SEQUENCE exchange_rate_id_seq;

CREATE TABLE "public"."exchange_rate" (
    "id" integer DEFAULT nextval('exchange_rate_id_seq') NOT NULL,
    "from" character(3) NOT NULL,
    "to" character(3) NOT NULL,
    "rate" numeric NOT NULL,
    "date" date NOT NULL
) WITH (oids = false);

DROP TABLE IF EXISTS "transaction";
DROP SEQUENCE IF EXISTS transaction_id_seq;
CREATE SEQUENCE transaction_id_seq;

CREATE TABLE "public"."transaction" (
    "id" integer DEFAULT nextval('transaction_id_seq') NOT NULL,
    "timestamp" timestamptz NOT NULL,
    "category" character varying(256) NOT NULL,
    "card" character(4) NOT NULL,
    "description" character varying(1024) NOT NULL,
    "currency" character(3) NOT NULL,
    "amount" numeric NOT NULL,
    "tags" character varying[] NOT NULL,
    CONSTRAINT "transaction_id" PRIMARY KEY ("id")
) WITH (oids = false);

CREATE INDEX "transaction_timestamp" ON "public"."transaction" USING btree ("timestamp");

CREATE VIEW transaction_uah
AS
SELECT transaction.id, timestamp, category, card, description, currency, amount * rate as amount, tags FROM transaction
JOIN exchange_rate ON exchange_rate.date = transaction.timestamp::date AND exchange_rate.from = transaction.currency;

DROP TABLE IF EXISTS "budget";
DROP SEQUENCE IF EXISTS budget_id_seq;
CREATE SEQUENCE budget_id_seq;

CREATE TABLE "public"."budget" (
    "id" integer DEFAULT nextval('budget_id_seq') NOT NULL,
    "date" date,
    "category" character varying(256) NOT NULL,
    "description" character varying(1024) NOT NULL,
    "currency" character(3) NOT NULL,
    "amount" numeric NOT NULL,
    "tags" character varying[] NOT NULL,
    CONSTRAINT "budget_id" PRIMARY KEY ("id")
) WITH (oids = false);

INSERT INTO budget (date, category, description, currency, amount, tags) VALUES
(NULL, 'Выдача наличных', 'Квартира в Запорожье', 'UAH', 3100, '{}'),
(NULL, 'Переводы', 'Маме', 'UAH', 5025, '{}'),
(NULL, 'Кафе, бары, рестораны', 'Лимит', 'UAH', 6000, '{}'),
(NULL, 'Продукты питания', 'Лимит', 'UAH', 5000, '{}'),
(NULL, 'Прочее', 'Мобильный счет', 'UAH', 160, '{}'),
(NULL, 'Прочее', 'Интернет', 'UAH', 140, '{}'),
(NULL, 'Прочее', 'Apple Music', 'UAH', 130, '{}'),
(NULL, 'Прочее', 'Apple iCloud', 'UAH', 30, '{}'),
(NULL, 'Прочее', 'Patreon', 'UAH', 30, '{}'),
(NULL, 'Прочее', 'Google', 'UAH', 160, '{}'),
(NULL, 'Прочее', 'Gold Card', 'UAH', 20, '{}'),
(NULL, 'Прочее', 'Прочие расходы', 'UAH', 1000, '{}')
;
