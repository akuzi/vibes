import { NextRequest, NextResponse } from 'next/server';
import { generateAustraliaVoxelData } from '@/lib/australia-data';

export async function GET(request: NextRequest) {
  try {
    console.log('API: Generating Australia voxel data...');
    console.log('API: Environment check - OPENTOPOGRAPHY_API_KEY exists:', !!process.env.OPENTOPOGRAPHY_API_KEY);
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
    });
    
    const dataPromise = generateAustraliaVoxelData();
    
    const voxelData = await Promise.race([dataPromise, timeoutPromise]) as any;
    
    console.log(`API: Generated ${voxelData.length} voxels`);
    console.log('API: First few voxels:', voxelData.slice(0, 3));
    
    // Sample voxels evenly across the entire area instead of just taking the first ones
    const maxVoxels = 60000; // Increased to show complete Australia
    let limitedData;
    
    if (voxelData.length <= maxVoxels) {
      limitedData = voxelData;
    } else {
      // Sample every nth voxel to get an even distribution
      const step = Math.floor(voxelData.length / maxVoxels);
      limitedData = [];
      for (let i = 0; i < voxelData.length && limitedData.length < maxVoxels; i += step) {
        limitedData.push(voxelData[i]);
      }
    }
    
    console.log(`API: Limited to ${limitedData.length} voxels for performance`);
    console.log('API: Data bounds - X:', Math.min(...limitedData.map((v: any) => v.x)), 'to', Math.max(...limitedData.map((v: any) => v.x)));
    console.log('API: Data bounds - Z:', Math.min(...limitedData.map((v: any) => v.z)), 'to', Math.max(...limitedData.map((v: any) => v.z)));
    
    const response = {
      success: true,
      data: limitedData,
      count: limitedData.length,
      totalGenerated: voxelData.length
    };
    
    console.log('API: Response size:', JSON.stringify(response).length, 'characters');
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('API: Error generating voxel data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate voxel data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 