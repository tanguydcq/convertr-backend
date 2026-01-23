import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config/index.js';

// Create S3 client (works with AWS S3, MinIO, Cloudflare R2)
export const s3Client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
    },
    forcePathStyle: true, // Required for MinIO
});

// Storage utility functions
export const storage = {
    /**
     * Upload a file to S3
     */
    async upload(
        key: string,
        body: Buffer | Uint8Array | string,
        contentType: string,
        metadata?: Record<string, string>
    ): Promise<string> {
        await s3Client.send(
            new PutObjectCommand({
                Bucket: config.S3_BUCKET,
                Key: key,
                Body: body,
                ContentType: contentType,
                Metadata: metadata,
            })
        );
        return key;
    },

    /**
     * Get a file from S3
     */
    async download(key: string): Promise<Buffer> {
        const response = await s3Client.send(
            new GetObjectCommand({
                Bucket: config.S3_BUCKET,
                Key: key,
            })
        );

        if (!response.Body) {
            throw new Error(`File not found: ${key}`);
        }

        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    },

    /**
     * Generate a signed URL for downloading (expires in 1 hour by default)
     */
    async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
        return getSignedUrl(
            s3Client,
            new GetObjectCommand({
                Bucket: config.S3_BUCKET,
                Key: key,
            }),
            { expiresIn }
        );
    },

    /**
     * Generate a signed URL for uploading (client-side uploads)
     */
    async getSignedUploadUrl(
        key: string,
        contentType: string,
        expiresIn = 3600
    ): Promise<string> {
        return getSignedUrl(
            s3Client,
            new PutObjectCommand({
                Bucket: config.S3_BUCKET,
                Key: key,
                ContentType: contentType,
            }),
            { expiresIn }
        );
    },

    /**
     * Delete a file from S3
     */
    async delete(key: string): Promise<void> {
        await s3Client.send(
            new DeleteObjectCommand({
                Bucket: config.S3_BUCKET,
                Key: key,
            })
        );
    },

    /**
     * Check if a file exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            await s3Client.send(
                new HeadObjectCommand({
                    Bucket: config.S3_BUCKET,
                    Key: key,
                })
            );
            return true;
        } catch {
            return false;
        }
    },

    /**
     * List files with a prefix
     */
    async list(prefix: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: config.S3_BUCKET,
                Prefix: prefix,
            })
        );

        return (response.Contents || []).map((obj) => ({
            key: obj.Key!,
            size: obj.Size!,
            lastModified: obj.LastModified!,
        }));
    },

    /**
     * Generate a key for tenant-specific files
     */
    generateKey(tenantId: string, type: string, filename: string): string {
        const timestamp = Date.now();
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${tenantId}/${type}/${timestamp}-${sanitizedFilename}`;
    },
};

export default storage;
