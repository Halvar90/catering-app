import { NextResponse } from 'next/server';
import { createApi } from 'unsplash-js';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Suchbegriff fehlt' },
        { status: 400 }
      );
    }

    // Unsplash API Key ist optional - funktioniert auch ohne für Basic Usage
    const unsplash = createApi({
      accessKey: process.env.UNSPLASH_ACCESS_KEY || 'demo',
    });

    const result = await unsplash.search.getPhotos({
      query: `${query} food photography`,
      perPage: 12,
      orientation: 'landscape',
    });

    if (result.errors) {
      throw new Error(result.errors[0]);
    }

    const photos = result.response?.results.map(photo => ({
      id: photo.id,
      url: photo.urls.regular,
      thumb: photo.urls.thumb,
      author: photo.user.name,
      authorUrl: photo.user.links.html,
      downloadUrl: photo.links.download_location,
    })) || [];

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Unsplash search error:', error);
    return NextResponse.json(
      { error: 'Bildersuche fehlgeschlagen' },
      { status: 500 }
    );
  }
}
