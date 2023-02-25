-- CreateTable
CREATE TABLE "Plugin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "entryFilename" TEXT,

    CONSTRAINT "Plugin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PluginFile" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contents" BYTEA NOT NULL,

    CONSTRAINT "PluginFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RtcPolicy" (
    "id" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "source" BYTEA NOT NULL,
    "compiled" BYTEA NOT NULL,
    "validationConfig" JSONB NOT NULL,

    CONSTRAINT "RtcPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plugin_name_key" ON "Plugin"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PluginFile_filename_pluginId_key" ON "PluginFile"("filename", "pluginId");

-- AddForeignKey
ALTER TABLE "PluginFile" ADD CONSTRAINT "PluginFile_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RtcPolicy" ADD CONSTRAINT "RtcPolicy_pluginId_fkey" FOREIGN KEY ("pluginId") REFERENCES "Plugin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
