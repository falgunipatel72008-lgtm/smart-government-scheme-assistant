import { v2 as cloudinary } from "cloudinary";
import { Readable } from "node:stream";

export function createCloudinaryService(config) {
  cloudinary.config({
    cloud_name: config.CLOUDINARY_CLOUD_NAME,
    api_key: config.CLOUDINARY_API_KEY,
    api_secret: config.CLOUDINARY_API_SECRET,
    secure: true
  });

  return {
    uploadImage(buffer) {
      return new Promise((resolve, reject) => {
        const upload = cloudinary.uploader.upload_stream(
          { folder: "myscheme/categories", resource_type: "image" },
          (error, result) => {
            if (error) return reject(error);
            if (!result?.secure_url || !result.public_id) {
              return reject(new Error("Cloudinary did not return an image URL"));
            }
            return resolve({ url: result.secure_url, publicId: result.public_id });
          }
        );

        upload.on("error", reject);
        Readable.from([buffer]).pipe(upload);
      });
    },
    deleteImage(publicId) {
      return cloudinary.uploader.destroy(publicId, { resource_type: "image" });
    }
  };
}
