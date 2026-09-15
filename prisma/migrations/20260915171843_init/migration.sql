-- CreateTable
CREATE TABLE "phrases" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'phrase',
    "source_locale" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "failed" BOOLEAN NOT NULL DEFAULT false,
    "needs_review" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phrases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phrase_texts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phrase_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "ipa" TEXT,
    "ipa_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "phrase_texts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_cache" (
    "cache_key" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "input_text" TEXT NOT NULL,
    "output_text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_hit_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("cache_key")
);

-- CreateTable
CREATE TABLE "media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT,
    "size_bytes" BIGINT,
    "phrase_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "phrase_texts_phrase_id_locale_key" ON "phrase_texts"("phrase_id", "locale");

-- CreateIndex
CREATE INDEX "translation_cache_source_target_idx" ON "translation_cache"("source", "target");

-- AddForeignKey
ALTER TABLE "phrase_texts" ADD CONSTRAINT "phrase_texts_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_phrase_id_fkey" FOREIGN KEY ("phrase_id") REFERENCES "phrases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Ownership: InsForge tooling (project_admin) administra estas tablas.
ALTER TABLE "phrases" OWNER TO project_admin;
ALTER TABLE "phrase_texts" OWNER TO project_admin;
ALTER TABLE "translation_cache" OWNER TO project_admin;
ALTER TABLE "media" OWNER TO project_admin;

-- RLS sin policies: bloquea anon/authenticated; project_admin (BYPASSRLS)
-- y Prisma (postgres) siguen accediendo. El runtime habla server-side.
ALTER TABLE "phrases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phrase_texts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "translation_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media" ENABLE ROW LEVEL SECURITY;

-- updated_at automático en phrases. Función propia en public: los schemas
-- internos de InsForge (system.*) no existen en la shadow DB de Prisma.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER phrases_set_updated_at
  BEFORE UPDATE ON "phrases"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Dominios validados en DB.
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_kind_check"
  CHECK ("kind" IN ('word', 'phrase'));
ALTER TABLE "phrases" ADD CONSTRAINT "phrases_source_locale_check"
  CHECK ("source_locale" IN ('es', 'pt', 'en', 'ca', 'gl'));
ALTER TABLE "phrase_texts" ADD CONSTRAINT "phrase_texts_locale_check"
  CHECK ("locale" IN ('es', 'pt', 'en', 'ca', 'gl'));
ALTER TABLE "translation_cache" ADD CONSTRAINT "translation_cache_source_check"
  CHECK ("source" IN ('es', 'pt', 'en', 'ca', 'gl'));
ALTER TABLE "translation_cache" ADD CONSTRAINT "translation_cache_target_check"
  CHECK ("target" IN ('es', 'pt', 'en', 'ca', 'gl'));
