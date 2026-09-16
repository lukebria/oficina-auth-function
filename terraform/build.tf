locals {
  build_dir = "${path.module}/.build/lambda"
  zip_path  = "${path.module}/.build/lambda.zip"
}

# Compila o TypeScript (npm run build) e monta em .build/lambda o pacote que vai pro zip:
# dist/src/** (sem os .js.map) + node_modules/jose (única dependência de produção, sem transitivas).
# Ver scripts/build-lambda.js.
resource "null_resource" "build" {
  triggers = {
    src_hash     = sha1(join("", [for f in fileset("${path.module}/../src", "**") : filesha1("${path.module}/../src/${f}")]))
    package_lock = filesha1("${path.module}/../package-lock.json")
    tsconfig     = filesha1("${path.module}/../tsconfig.json")
    build_script = filesha1("${path.module}/../scripts/build-lambda.js")
  }

  provisioner "local-exec" {
    command     = "node scripts/build-lambda.js"
    working_dir = "${path.module}/.."
  }
}

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = local.build_dir
  output_path = local.zip_path

  depends_on = [null_resource.build]
}
