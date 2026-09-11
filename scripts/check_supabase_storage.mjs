import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  console.log('1. Checking storage buckets...');
  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error('Error listing buckets:', bucketsErr);
  } else {
    console.log('Buckets:', buckets.map(b => ({ id: b.id, name: b.name, public: b.public })));
  }

  console.log('\n2b. Checking generated_images rows...');
  const { data: genImages, error: genErr } = await supabase
    .from('generated_images')
    .select('id, type_creation, date_creation, url')
    .order('date_creation', { ascending: false });

  if (genErr) {
    console.error('Error querying generated_images:', genErr);
  } else {
    console.log(`Found ${genImages.length} generated images:`);
    for (const img of genImages) {
      const isBase64 = img.url?.startsWith('data:');
      console.log(`- ID: ${img.id}, Type: ${img.type_creation}, isBase64: ${isBase64}, urlLength: ${img.url?.length}, urlPrefix: ${img.url?.slice(0, 50)}`);
    }
  }
  const { data: images, error: imgErr } = await supabase
    .from('imported_images')
    .select('id, filename, file_size, date_import, url')
    .order('date_import', { ascending: false });

  if (imgErr) {
    console.error('Error querying imported_images:', imgErr);
  } else {
    console.log(`Found ${images.length} images:`);
    for (const img of images) {
      const isBase64 = img.url?.startsWith('data:');
      console.log(`- ID: ${img.id}, File: ${img.filename}, Size: ${img.file_size}, isBase64: ${isBase64}, urlLength: ${img.url?.length}`);
    }
  }
  console.log('\n3. Testing upload to imported-images bucket...');
  const testBuffer = Buffer.from('test png content');
  const testName = 'test_upload_' + Date.now() + '.txt';
  const { data: upData, error: upErr } = await supabase.storage
    .from('imported-images')
    .upload(testName, testBuffer, { contentType: 'text/plain', upsert: true });

  if (upErr) {
    console.error('Upload FAILED:', upErr);
  } else {
    console.log('Upload SUCCESS:', upData);
    const { data: urlData } = supabase.storage.from('imported-images').getPublicUrl(testName);
    console.log('Public URL:', urlData.publicUrl);
    // Cleanup
    await supabase.storage.from('imported-images').remove([testName]);
    console.log('Cleanup done.');
  }
}

main();
