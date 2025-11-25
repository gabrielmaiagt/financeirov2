
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Define the allowed documentation files to prevent arbitrary file access
const ALLOWED_DOCS = {
    buckpay: 'buckpay_documentation.md',
    paradise: 'paradise_documentation.md',
};

type DocKey = keyof typeof ALLOWED_DOCS;

// Helper to get the full path to the doc file
function getDocPath(doc: DocKey) {
    return path.join(process.cwd(), 'docs', ALLOWED_DOCS[doc]);
}

/**
 * GET handler to read the documentation content.
 * Expects a query parameter `doc` which should be 'buckpay' or 'paradise'.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const docType = searchParams.get('doc') as DocKey;

  if (!docType || !ALLOWED_DOCS[docType]) {
    return NextResponse.json({ error: 'Document type not specified or not allowed' }, { status: 400 });
  }

  try {
    const filePath = getDocPath(docType);
    const content = await fs.readFile(filePath, 'utf8');
    return NextResponse.json({ content });
  } catch (error: any) {
    // If the file doesn't exist, return empty content which is a valid state
    if (error.code === 'ENOENT') {
        return NextResponse.json({ content: '' });
    }
    console.error(`Error reading documentation for ${docType}:`, error);
    return NextResponse.json({ error: 'Failed to read documentation file' }, { status: 500 });
  }
}

/**
 * POST handler to write content to a documentation file.
 * Expects a JSON body with `doc` ('buckpay' or 'paradise') and `content`.
 */
export async function POST(request: Request) {
  try {
    const { doc, content } = await request.json();
    const docType = doc as DocKey;

    if (!docType || !ALLOWED_DOCS[docType] || typeof content !== 'string') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const filePath = getDocPath(docType);
    await fs.writeFile(filePath, content, 'utf8');
    
    return NextResponse.json({ message: 'Documentation saved successfully' });
  } catch (error) {
    console.error('Error saving documentation:', error);
    return NextResponse.json({ error: 'Failed to save documentation file' }, { status: 500 });
  }
}

