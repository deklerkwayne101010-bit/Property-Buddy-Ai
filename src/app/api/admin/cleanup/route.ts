import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Only allow admin access (you might want to add proper authentication)
    // For now, we'll allow any authenticated user, but you should restrict this

    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') === 'true';

    // Calculate the cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    console.log(`Starting cleanup job. Cutoff date: ${cutoffDate.toISOString()}`);
    console.log(`Dry run mode: ${dryRun}`);

    // Find all user media files older than 30 days from multiple tables
    const queries = [
      // Query user_media table
      supabase
        .from('user_media')
        .select('id, file_name, file_url, created_at, media_type')
        .eq('media_type', 'image')
        .lt('created_at', cutoffDate.toISOString()),

      // Query generated_images table
      supabase
        .from('generated_images')
        .select('id, image_url, created_at, tool_type')
        .lt('created_at', cutoffDate.toISOString())
    ];

    const results = await Promise.all(queries);
    const oldFiles: any[] = [];

    // Combine results from all tables
    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Error fetching from table ${index}:`, result.error);
        return;
      }
      if (result.data && Array.isArray(result.data)) {
        // Normalize the data structure
        const tableName = index === 0 ? 'user_media' : 'generated_images';
        const normalizedData = result.data.map((item: any) => ({
          id: item.id,
          file_name: item.file_name || (item.image_url ? item.image_url.split('/').pop() : `file_${item.id}`),
          file_url: item.file_url || item.image_url,
          created_at: item.created_at,
          media_type: item.media_type || item.tool_type || 'image',
          table: tableName
        }));
        oldFiles.push(...normalizedData);
      }
    });

    if (!oldFiles || oldFiles.length === 0) {
      console.log('No old files found for cleanup');
      return NextResponse.json({
        success: true,
        message: 'No files to clean up',
        filesProcessed: 0,
        filesDeleted: 0
      });
    }

    console.log(`Found ${oldFiles.length} files to clean up`);

    let filesDeleted = 0;
    const errors: string[] = [];

    // Process each file
    for (const file of oldFiles) {
      try {
        console.log(`Processing file: ${file.file_name}`);

        if (!dryRun) {
          // Delete from Supabase storage
          const { error: storageError } = await supabase.storage
            .from('video-assets')
            .remove([file.file_name]);

          if (storageError) {
            console.error(`Failed to delete ${file.file_name} from storage:`, storageError);
            errors.push(`Storage deletion failed for ${file.file_name}: ${storageError.message}`);
            continue;
          }

          // Delete from database
          const { error: dbError } = await supabase
            .from('user_media')
            .delete()
            .eq('id', file.id);

          if (dbError) {
            console.error(`Failed to delete ${file.file_name} from database:`, dbError);
            errors.push(`Database deletion failed for ${file.file_name}: ${dbError.message}`);
            continue;
          }
        }

        filesDeleted++;
        console.log(`Successfully deleted: ${file.file_name}`);

      } catch (err) {
        const errorMsg = `Error processing ${file.file_name}: ${err instanceof Error ? err.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const result = {
      success: true,
      message: dryRun ? 'Dry run completed' : 'Cleanup completed',
      filesProcessed: oldFiles.length,
      filesDeleted,
      errors: errors.length > 0 ? errors : undefined,
      cutoffDate: cutoffDate.toISOString()
    };

    console.log('Cleanup job completed:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Cleanup job failed:', error);
    return NextResponse.json(
      {
        error: 'Cleanup job failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check cleanup status or get statistics
export async function GET() {
  try {
    // Get statistics about files that would be cleaned up
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const { data: oldFiles, error } = await supabase
      .from('user_media')
      .select('id, created_at, media_type')
      .eq('media_type', 'image')
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      console.error('Error fetching cleanup statistics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch cleanup statistics' },
        { status: 500 }
      );
    }

    // Get total files count from multiple tables
    const totalQueries = [
      supabase
        .from('user_media')
        .select('*', { count: 'exact', head: true })
        .eq('media_type', 'image'),
      supabase
        .from('generated_images')
        .select('*', { count: 'exact', head: true })
    ];

    const totalResults = await Promise.all(totalQueries);
    const totalFiles = (totalResults[0].count || 0) + (totalResults[1].count || 0);

    return NextResponse.json({
      totalImageFiles: totalFiles || 0,
      filesToCleanup: oldFiles?.length || 0,
      cutoffDate: cutoffDate.toISOString(),
      nextCleanupDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Next day
    });

  } catch (error) {
    console.error('Failed to get cleanup statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get cleanup statistics' },
      { status: 500 }
    );
  }
}