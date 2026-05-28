import { v2 as cloudinary } from "cloudinary";

function getCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export async function uploadMedia(file, folder = "hkm-wapi") {
  const cl     = getCloudinary();
  const result = await cl.uploader.upload(file, { folder, resource_type: "auto" });
  return {
    url:      result.secure_url,
    publicId: result.public_id,
    format:   result.format,
    size:     result.bytes,
    width:    result.width,
    height:   result.height,
  };
}

export async function deleteMedia(publicId) {
  return getCloudinary().uploader.destroy(publicId);
}

export default cloudinary;
