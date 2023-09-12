import { NFTStorage } from 'nft.storage';

// setup
const client = new NFTStorage({
  token: String(process.env.NFT_STORAGE_API_KEY),
});

/**
 * @dev Read file (image) and upload to nft.storage
 * Reads am image file from imagePath stores and NFT with
 * the given metadata
 * @param imagePath the path to the image file
 * @param name the name of then NFT
 * @param description a text description of the NFT
 */
function uploadNFT({ name, description, image, attributes = '' }) {
  // init store
  return client.store({
    name: name,
    description: description,
    image: image,
    properties: attributes
      ? {
          kind: 'slad',
          from: 'medive',
          attributes: attributes,
        }
      : {},
  });
}

// check status
/**
 * @dev Helper function to check status
 * of an uploaded file
 * @param cid content identifier of the file
 * @returns bool
 */
export async function checkStatus(cid) {
  const info = await client.check(cid);

  console.log('Waiting for deal confirmation...\n');
  if (info.deals.length > 0) {
    console.log('Listing deals:\n');
  }

  for (const deal of info.deals) {
    console.log(deal);
  }

  console.log('Waiting for deal confirmation...\n');
  if (info.pin.status === 'pinned' && info.deals.length > 0) {
    return true;
  }
}

// TODO: use cli arguement to accept file and other options
/**
 * @param imagePath image path which is a string
 * @param name of the nft
 * @param description a short detail about the nft
 * @param attributes an array of {trai} a short detail about the nft
 * @returns cid - content identifier hash of the data on nft.storage
 */
export async function uploadDataToNFTStorage({
  image,
  name,
  description,
  attributes,
}) {
  let cid = '';
  //
  // upload image with metadata

  try {
    const metadata = await uploadNFT({
      image,
      description,
      name,
      attributes,
    });

    console.log('Uploading...\n');

    const timeId = setTimeout(() => {
      clearTimeout(timeId);
    }, 3000);

    if (metadata.url) {
      console.log('Upload finished...\n');
    }

    const [a, b] = metadata.url.split('://');

    return {
      metadata_url: metadata.url,
      accessOnAllBrowser: `https://nftstorage.link/${a}/${b}`,
    };
  } catch (error) {
    throw error;
  }
}
