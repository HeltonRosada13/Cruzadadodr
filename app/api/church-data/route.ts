import { NextResponse } from 'next/server';
import firebaseConfig from '@/firebase-applet-config.json';
import { initialChurchData } from '@/lib/churchData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FIRESTORE_DATABASE_ID =
  firebaseConfig.firestoreDatabaseId ||
  'ai-studio-igrejacatedralde-1689f903-4252-4c97-842d-c7bb1fa516bf';
const FIRESTORE_DOC_PATH = 'church_data';
const FIRESTORE_DOC_ID = 'main';
const FIRESTORE_REST_URL = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${FIRESTORE_DATABASE_ID}/documents/${FIRESTORE_DOC_PATH}/${FIRESTORE_DOC_ID}`;

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return null;
}

function parseFirestoreRestDoc(docData: any): Record<string, any> | null {
  if (!docData || !docData.fields) return null;
  const res: Record<string, any> = {};
  for (const [k, v] of Object.entries(docData.fields)) {
    res[k] = parseFirestoreValue(v);
  }
  return res;
}

function toFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreRestValue) } };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = toFirestoreRestValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFirestoreRestDoc(obj: Record<string, any>): { fields: Record<string, any> } {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreRestValue(v);
    }
  }
  return { fields };
}

export async function GET() {
  try {
    const res = await fetch(FIRESTORE_REST_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      const parsed = parseFirestoreRestDoc(data);
      if (parsed) {
        return NextResponse.json({
          success: true,
          data: {
            ...initialChurchData,
            ...parsed,
          },
        });
      }
    }
  } catch (error) {
    console.error('API GET /api/church-data error:', error);
  }

  return NextResponse.json({
    success: true,
    data: initialChurchData,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    const payload = toFirestoreRestDoc({
      ...body,
      lastUpdatedAt: new Date().toISOString(),
      editTimestamp: Date.now(),
    });

    const res = await fetch(FIRESTORE_REST_URL, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const result = await res.json();
      const parsed = parseFirestoreRestDoc(result);
      return NextResponse.json({ success: true, data: parsed });
    } else {
      const errText = await res.text();
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }
  } catch (error: any) {
    console.error('API POST /api/church-data error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Server error' }, { status: 500 });
  }
}
