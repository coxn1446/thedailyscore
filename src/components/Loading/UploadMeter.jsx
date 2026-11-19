import React from 'react';

const UploadMeter = ({ value = 0 }) => (
  <div>
    <p className="font-sans text-kicker uppercase tracking-kicker text-muted">Uploading</p>
    <progress aria-label="Uploading" className="upload-meter mt-space-xs w-full" max={100} value={value} />
  </div>
);

export default UploadMeter;
