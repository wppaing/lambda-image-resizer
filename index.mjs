import { GetObjectCommand, PutObjectCommand, S3 } from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3 = new S3();

export const handler = async (event) => {
  const sourceBucket = event.Records[0].s3.bucket.name;
  const sourceKey = event.Records[0].s3.object.key;
  const destinationBucket = "streaming-assets-uat";

  // Fetch the original image from the source bucket
  const getCommand = new GetObjectCommand({
    Bucket: sourceBucket,
    Key: sourceKey,
  });
  const response = await s3.send(getCommand);
  const sourceImage = await response.Body.transformToByteArray();

  // Resize the image to different resolutions
  const resizedImages = await Promise.all([
    sharp(sourceImage).resize(100, 100).jpeg({ quality: 90 }).toBuffer(),
    sharp(sourceImage).resize(320, 320).jpeg({ quality: 90 }).toBuffer(),
    sharp(sourceImage).resize(640, 640).jpeg({ quality: 90 }).toBuffer(),
  ]);

  // Upload the resized images to the destination bucket
  await Promise.all(
    resizedImages.map(async (image, idx) => {
      const fileName = {
        0: 100,
        1: 320,
        2: 640,
      };
      const command = new PutObjectCommand({
        Bucket: destinationBucket,
        Key: `${sourceKey}/${fileName[idx]}`,
        Body: image,
        ContentType: "image/jpeg",
      });
      await s3.send(command);
    })
  );

  // Return a success message
  return {
    statusCode: 200,
    message: "Successfully resized and uploaded images",
  };
};
