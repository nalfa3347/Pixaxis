import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function migrate() {
  console.log('Fetching imported images with base64 URLs...');
  const { data: images, error } = await supabase
    .from('imported_images')
    .select('id, user_id, filename, url')
    .order('date_import', { ascending: false });

  if (error) {
    console.error('Error fetching images:', error);
    return;
  }

  const base64Images = images.filter(img => img.url?.startsWith('data:'));
  console.log(`Found ${base64Images.length} images to migrate to Supabase Storage...`);

  for (let i = 0; i < base64Images.length; i++) {
    const img = base64Images[i];
    const match = img.url.match(/^data:([^;]+);base64,(.+)$/s);
    if (!match) {
      console.log(`[${i + 1}/${base64Images.length}] Skipping invalid data URI: ${img.id}`);
      continue;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const cleanName = (img.filename || 'imported_image')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${img.user_id}/${Date.now()}_${cleanName}`;

    console.log(`[${i + 1}/${base64Images.length}] Uploading ${cleanName} (${(buffer.length / 1024).toFixed(1)} KB) to storage...`);

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('imported-images')
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadErr) {
      console.error(`  Upload error for ${img.id}:`, uploadErr);
      continue;
    }

    const { data: urlData } = supabase.storage
      .from('imported-images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;
    console.log(`  Uploaded! Public URL: ${publicUrl.slice(0, 70)}...`);

    const { error: updateErr } = await supabase
      .from('imported_images')
      .update({ url: publicUrl })
      .eq('id', img.id);

    if (updateErr) {
      console.error(`  Failed to update DB for ${img.id}:`, updateErr);
    } else {
      console.log(`  DB updated successfully!`);
    }
  }

  console.log('Migration complete!');
}

migrate();
