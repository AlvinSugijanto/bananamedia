import { NextResponse } from "next/server";
import axios from "axios";

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file = data.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("pinataMetadata", JSON.stringify({
      name: file.name,
    }));
    formData.append("pinataOptions", JSON.stringify({
      cidVersion: 1,
    }));

    const pinataJWT = process.env.PINATA_JWT;

    if (!pinataJWT) {
      return NextResponse.json({ error: "Pinata JWT not configured" }, { status: 500 });
    }

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${(formData as any)._boundary}`,
        Authorization: `Bearer ${pinataJWT}`,
      },
    });

    return NextResponse.json({ ipfsHash: res.data.IpfsHash });
  } catch (e) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
