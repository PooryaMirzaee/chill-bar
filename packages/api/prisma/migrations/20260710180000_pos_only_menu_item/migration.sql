-- POS-only menu items (visible in register, hidden from customer app)
ALTER TABLE "MenuItem" ADD COLUMN "posOnly" BOOLEAN NOT NULL DEFAULT false;
