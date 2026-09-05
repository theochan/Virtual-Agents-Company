import React, { useEffect, useState } from 'react';
import { getStockPortraits, PortraitGender } from '../lib/avatarCatalog';

export function StockPortraitPicker({ gender, value, onChange }: {
  gender: PortraitGender;
  value: string;
  onChange: (url: string) => void;
}) {
  const portraits = getStockPortraits(gender);
  const [customUrl, setCustomUrl] = useState('');
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState<string[]>([]);
  useEffect(() => { setError(''); }, [value]);
  const isStock = portraits.some((photo) => photo.url === value);

  return (
    <section aria-label="Portrait picker" className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">Choose a portrait</h4>
        <span className="text-[10px] text-slate-500">{isStock ? 'Stock photo' : 'Custom image'}</span>
      </div>
      <img src={value} alt="Selected agent portrait" referrerPolicy="no-referrer"
        onError={() => setError('This image could not be loaded. Choose another photo or enter a different URL.')}
        className="mx-auto aspect-square w-40 rounded-xl object-cover border border-slate-200" />
      <p className="text-xs text-slate-600">{portraits.length} optional stock photos. Select one to use as the agent’s portrait.</p>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2" aria-label="Stock portraits">
        {portraits.map((photo) => (
          <button key={photo.url} type="button" aria-label={photo.label} aria-pressed={photo.url === value}
            disabled={unavailable.includes(photo.url)} onClick={() => onChange(photo.url)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 focus-visible:outline-2 focus-visible:outline-amber-600 ${photo.url === value ? 'border-amber-500 ring-2 ring-amber-200' : 'border-transparent hover:border-slate-400'}`}>
            {unavailable.includes(photo.url) ? <span className="text-[10px] text-slate-500">Photo unavailable</span> :
              <img src={photo.url} alt="" loading="lazy" referrerPolicy="no-referrer"
                onError={() => setUnavailable((urls) => [...urls, photo.url])} className="w-full h-full object-cover" />}
            {photo.url === value && <span aria-hidden="true" className="absolute right-0 bottom-0 bg-amber-500 text-white px-1">✓</span>}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500">Photos from <a href="https://unsplash.com/license" target="_blank" rel="noreferrer" className="underline">Unsplash</a>. Depicted people are not employees and do not endorse these agents.</p>
      <details className="text-xs text-slate-600">
        <summary className="cursor-pointer">Use a custom image URL</summary>
        <label className="block mt-2">Image URL
          <input type="url" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://example.com/portrait.jpg"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2" />
        </label>
        <button type="button" className="mt-2 rounded-lg bg-slate-900 text-white px-3 py-2" onClick={() => {
          try {
            const url = new URL(customUrl.trim());
            if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
            setError(''); onChange(url.toString());
          } catch { setError('Enter a valid HTTP or HTTPS image URL.'); }
        }}>Use image</button>
      </details>
    </section>
  );
}
