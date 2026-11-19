import React from 'react';
import { inkButtonClass, ruleButtonClass } from '../Auth/AuthPageLayout';

const PublishForm = ({ onEdit, pending, error }) => (
  <>
    {error ? (
      <p role="alert" className="px-space-sm pt-space-sm font-sans text-body-md text-error">
        {error}
      </p>
    ) : null}
    <div className="mt-space-sm flex items-center gap-space-sm border-t border-border px-space-sm py-space-sm">
      <button type="button" disabled={pending} onClick={onEdit} className={ruleButtonClass}>
        Edit
      </button>
      <button type="submit" disabled={pending} className={`${inkButtonClass} ml-auto`}>
        Post
      </button>
    </div>
  </>
);

export default PublishForm;
