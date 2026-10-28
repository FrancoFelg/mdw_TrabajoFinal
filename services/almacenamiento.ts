import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Dónde viven los archivos de los reportes (fotos y audios).
// Se elige con ALMACENAMIENTO_PROVEEDOR:
//   - local (por defecto): disco, en ALMACENAMIENTO_DIR. En prod es un volumen del compose.
//   - s3: AWS S3 (o compatible). S3_BUCKET, S3_REGION y credenciales por las variables estándar de AWS.
//   - azure: Azure Blob Storage. AZURE_STORAGE_CONNECTION_STRING y AZURE_STORAGE_CONTAINER.
// La base guarda solo la `clave`; el resto de la app no sabe qué proveedor hay detrás.
export interface Almacenamiento {
  guardar(clave: string, datos: Buffer, mime: string): Promise<void>;
  leer(clave: string): Promise<Buffer>;
  borrar(clave: string): Promise<void>;
}

class AlmacenamientoLocal implements Almacenamiento {
  constructor(private raiz: string) {}

  // La clave la arma el servidor, pero igual se valida que no salga de la raíz.
  private ruta(clave: string) {
    const destino = path.resolve(this.raiz, clave);
    if (!destino.startsWith(path.resolve(this.raiz) + path.sep)) throw new Error('CLAVE_INVALIDA');
    return destino;
  }

  async guardar(clave: string, datos: Buffer) {
    const destino = this.ruta(clave);
    await mkdir(path.dirname(destino), { recursive: true });
    await writeFile(destino, datos, { flag: 'wx' });
  }

  async leer(clave: string) {
    return readFile(this.ruta(clave));
  }

  async borrar(clave: string) {
    await unlink(this.ruta(clave)).catch(() => {});
  }
}

class AlmacenamientoS3 implements Almacenamiento {
  constructor(private bucket: string, private region: string) {}

  private async cliente() {
    const { S3Client } = await import('@aws-sdk/client-s3');
    return new S3Client({ region: this.region });
  }

  async guardar(clave: string, datos: Buffer, mime: string) {
    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.cliente()).send(new PutObjectCommand({ Bucket: this.bucket, Key: clave, Body: datos, ContentType: mime }));
  }

  async leer(clave: string) {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
    const r = await (await this.cliente()).send(new GetObjectCommand({ Bucket: this.bucket, Key: clave }));
    if (!r.Body) throw new Error('ADJUNTO_NO_ENCONTRADO');
    return Buffer.from(await r.Body.transformToByteArray());
  }

  async borrar(clave: string) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    await (await this.cliente()).send(new DeleteObjectCommand({ Bucket: this.bucket, Key: clave }));
  }
}

class AlmacenamientoAzure implements Almacenamiento {
  constructor(private conexion: string, private contenedor: string) {}

  private async blob(clave: string) {
    const { BlobServiceClient } = await import('@azure/storage-blob');
    return BlobServiceClient.fromConnectionString(this.conexion).getContainerClient(this.contenedor).getBlockBlobClient(clave);
  }

  async guardar(clave: string, datos: Buffer, mime: string) {
    await (await this.blob(clave)).uploadData(datos, { blobHTTPHeaders: { blobContentType: mime } });
  }

  async leer(clave: string) {
    return (await this.blob(clave)).downloadToBuffer();
  }

  async borrar(clave: string) {
    await (await this.blob(clave)).deleteIfExists();
  }
}

let instancia: Almacenamiento | null = null;

export function almacenamiento(): Almacenamiento {
  if (instancia) return instancia;
  const proveedor = (process.env.ALMACENAMIENTO_PROVEEDOR ?? 'local').toLowerCase();
  if (proveedor === 's3') {
    if (!process.env.S3_BUCKET || !process.env.S3_REGION) throw new Error('ALMACENAMIENTO_NO_CONFIGURADO');
    instancia = new AlmacenamientoS3(process.env.S3_BUCKET, process.env.S3_REGION);
  } else if (proveedor === 'azure') {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING || !process.env.AZURE_STORAGE_CONTAINER) throw new Error('ALMACENAMIENTO_NO_CONFIGURADO');
    instancia = new AlmacenamientoAzure(process.env.AZURE_STORAGE_CONNECTION_STRING, process.env.AZURE_STORAGE_CONTAINER);
  } else {
    instancia = new AlmacenamientoLocal(process.env.ALMACENAMIENTO_DIR ?? path.join(process.cwd(), 'almacenamiento'));
  }
  return instancia;
}
