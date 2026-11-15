-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fulfilment" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "destination_country" TEXT,
    "mobile" TEXT NOT NULL,
    "travel_date" DATETIME,
    "gross_inr" DECIMAL NOT NULL,
    "service_charge_inr" DECIMAL NOT NULL,
    "gst_taxable_value_inr" DECIMAL NOT NULL,
    "gst_inr" DECIMAL NOT NULL,
    "tcs_inr" DECIMAL NOT NULL,
    "total_inr" DECIMAL NOT NULL,
    "usd_equivalent" DECIMAL NOT NULL,
    "quote_snapshot" JSONB NOT NULL,
    "settings_snapshot" JSONB NOT NULL,
    "payment_mode" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'NOT_DUE',
    "payment_reference" TEXT,
    "payer_name" TEXT,
    "payer_account" TEXT,
    "payer_matches_applicant" BOOLEAN NOT NULL DEFAULT false,
    "paid_at" DATETIME,
    "kyc_submitted_at" DATETIME,
    "kyc_approved_at" DATETIME,
    "dispatched_at" DATETIME,
    "handed_over_at" DATETIME,
    "cancelled_at" DATETIME,
    "courier_name" TEXT,
    "courier_awb" TEXT,
    "is_high_value" BOOLEAN NOT NULL DEFAULT false,
    "flags" JSONB NOT NULL,
    "pan" TEXT,
    "passport_number" TEXT,
    "customer_name" TEXT,
    "store_id" TEXT,
    "pickup_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_lines" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "forex_amount" DECIMAL NOT NULL,
    "rate" DECIMAL NOT NULL,
    "inr_amount" DECIMAL NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "order_lines_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kyc_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_SUBMITTED',
    "entered_by" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "full_name" TEXT,
    "date_of_birth" DATETIME,
    "gender" TEXT,
    "nationality" TEXT,
    "residential_status" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "pan" TEXT,
    "passport_number" TEXT,
    "passport_issue_date" DATETIME,
    "passport_expiry_date" DATETIME,
    "passport_place_of_issue" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "address_differs_from_passport" BOOLEAN NOT NULL DEFAULT false,
    "destination_country" TEXT,
    "travel_date" DATETIME,
    "return_date" DATETIME,
    "ticket_pnr_or_number" TEXT,
    "visa_status" TEXT,
    "occupation" TEXT,
    "source_of_funds" TEXT,
    "prior_lrs_inr" DECIMAL NOT NULL DEFAULT 0,
    "funded_by_education_loan" BOOLEAN NOT NULL DEFAULT false,
    "payout_mode" TEXT,
    "payout_bank_account_name" TEXT,
    "payout_account_number" TEXT,
    "payout_ifsc" TEXT,
    "declaration_name" TEXT,
    "declaration_at" DATETIME,
    "declaration_ip" TEXT,
    "declaration_user_agent" TEXT,
    "self_use_declared_at" DATETIME,
    "privacy_consent_at" DATETIME,
    "rejection_reason" TEXT,
    "originals_sighted" BOOLEAN NOT NULL DEFAULT false,
    "submitted_at" DATETIME,
    "reviewed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "kyc_records_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kyc_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kyc_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "superseded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "kyc_documents_kyc_id_fkey" FOREIGN KEY ("kyc_id") REFERENCES "kyc_records" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "meta" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "order_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "gst_rate_percent" DECIMAL NOT NULL DEFAULT 18,
    "gst_slabs" JSONB NOT NULL,
    "service_charge_type" TEXT NOT NULL DEFAULT 'FLAT',
    "service_charge_value" DECIMAL NOT NULL DEFAULT 0,
    "buy_margin_percent" DECIMAL NOT NULL DEFAULT 1.5,
    "sell_margin_percent" DECIMAL NOT NULL DEFAULT 1.5,
    "high_value_threshold_inr" DECIMAL NOT NULL DEFAULT 200000,
    "tcs_threshold_inr" DECIMAL NOT NULL DEFAULT 1000000,
    "tcs_rates" JSONB NOT NULL,
    "rates_updated_at" DATETIME,
    "charges_updated_at" DATETIME,
    "charges_updated_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "countries" JSONB NOT NULL,
    "image_path" TEXT NOT NULL,
    "ref_rate" DECIMAL NOT NULL,
    "buy_rate" DECIMAL NOT NULL,
    "sell_rate" DECIMAL NOT NULL,
    "manual_override" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "banners" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "image_path" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "headline" TEXT,
    "subline" TEXT,
    "link_url" TEXT,
    "position" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "external_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_photo_url" TEXT,
    "author_uri" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "relative_time" TEXT NOT NULL,
    "published_at" DATETIME,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "review_summary" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "rating" DECIMAL NOT NULL,
    "total_ratings" INTEGER NOT NULL,
    "maps_uri" TEXT,
    "fetched_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "callback_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "preferred_time" TEXT,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'CALLBACK',
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "handled_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "stores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "phone" TEXT NOT NULL,
    "hours" TEXT NOT NULL,
    "maps_url" TEXT NOT NULL,
    "embed_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "order_sequences" (
    "day" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_ref_key" ON "orders"("ref");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_mobile_idx" ON "orders"("mobile");

-- CreateIndex
CREATE INDEX "orders_pan_idx" ON "orders"("pan");

-- CreateIndex
CREATE INDEX "orders_passport_number_idx" ON "orders"("passport_number");

-- CreateIndex
CREATE INDEX "order_lines_order_id_idx" ON "order_lines"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "kyc_records_order_id_key" ON "kyc_records"("order_id");

-- CreateIndex
CREATE INDEX "kyc_documents_kyc_id_idx" ON "kyc_documents"("kyc_id");

-- CreateIndex
CREATE INDEX "order_events_order_id_idx" ON "order_events"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_external_id_key" ON "reviews"("external_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entity_id_idx" ON "audit_logs"("entity", "entity_id");
