export async function uploadImageToIPFS(input: File | string): Promise<{ cid: string; url: string }> {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error("Missing NEXT_PUBLIC_PINATA_JWT for IPFS uploads");
  }

  let file: File;
  if (typeof input === "string") {
    const res = await fetch(input);
    const blob = await res.blob();
    file = new File([blob], "image.png", { type: blob.type || "image/png" });
  } else {
    file = input;
  }

  const form = new FormData();
  form.append("file", file);

  const resp = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: form,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`IPFS upload failed: ${resp.status} ${text}`);
  }

  const data = await resp.json();
  const cid: string = data.IpfsHash || data.cid || data.Hash;
  const url = `https://ipfs.io/ipfs/${cid}`;
  return { cid, url };
}

export async function uploadJsonToIPFS(obj: unknown): Promise<{ cid: string; url: string }> {
  const jwt = process.env.NEXT_PUBLIC_PINATA_JWT;
  if (!jwt) {
    throw new Error("Missing NEXT_PUBLIC_PINATA_JWT for IPFS uploads");
  }
  const resp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(obj),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`IPFS JSON upload failed: ${resp.status} ${text}`);
  }
  const data = await resp.json();
  const cid: string = data.IpfsHash || data.cid || data.Hash;
  const url = `https://ipfs.io/ipfs/${cid}`;
  return { cid, url };
}
