// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { uploadDataToNFTStorage } from '../ipfs';

function CreateCar({ createCar }) {
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState([]);
  const [imageURLs, setImageURLs] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const onImgaeChange = (e) => {
    setImages([...e.target.files]);
  };

  const uploadToIPFS = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setIsLoading(true);
    console.log({ name, description, images });

    uploadDataToNFTStorage({ image: images[0], name, description })
      .then((res) => {
        console.log(res);
        // await createCar(document.getElementById('cid').value);
        setName('');
        setDescription('');
        setImages([]);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (images.length < 1) return;
    const newImageUrls = [];
    images.forEach((img) => {
      newImageUrls.push(URL.createObjectURL(img));
    });
    setImageURLs(newImageUrls);
  }, [images]);

  return (
    <div className='App'>
      <h1>Add New Car</h1>
      <input
        type='file'
        id='car-picture'
        multiple
        accept='image/*'
        required
        onChange={onImgaeChange}
      />

      {imageURLs.map((imgSrc, i) => (
        <img src={imgSrc} alt='' width={100} key={i} />
      ))}

      {/* Form for creating a new car NFT */}
      <form onSubmit={uploadToIPFS} className='box'>
        {/* <input type='text' id='cid' placeholder='Content ID (CID)' required /> */}
        <input
          type='text'
          id='name'
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder='Name of item'
          required
        />
        <input
          type='text'
          id='description'
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder='Description of item'
          required
        />
        <div style={{ width: '100%' }}>
          {/* Submit button to create a new car NFT */}
          <button type='submit' className='primary-btn' disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateCar;
