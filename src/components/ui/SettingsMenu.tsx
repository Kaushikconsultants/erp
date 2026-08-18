"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import SettingsModal from './SettingsModal';
import ThemeSettingsModal from './ThemeSettingsModal';

export default function SettingsMenu() {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  const companySettings = [
    { label: "Organization Profile & Logo", href: "/settings/organization" },
    { label: "Appearance & Theme", modal: "Theme" },
    { label: "Roles & Permissions", href: "/settings/roles" },
    { label: "Territory Management", href: "/settings/territories" },
    { label: "Incentive Rules", modal: "Incentive Rules" },
    { label: "Backup Data", modal: "Backup Data" }
  ];

  const teamSettings = [
    "Manage Teams",
    "Sales Targets",
    "Attendance Rules"
  ];

  return (
    <>
      <div className="glass-panel settings-card">
        <h3>Company Settings</h3>
        <ul className="settings-list">
          {companySettings.map(setting => (
            <li key={setting.label}>
              {setting.href ? (
                <Link href={setting.href} className="settings-link-btn">
                  {setting.label}
                </Link>
              ) : (
                <button className="settings-link-btn" onClick={() => setActiveFeature(setting.modal!)}>
                  {setting.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
      
      <div className="glass-panel settings-card">
        <h3>Teams & Departments</h3>
        <ul className="settings-list">
          {teamSettings.map(setting => (
            <li key={setting}>
              <button className="settings-link-btn" onClick={() => setActiveFeature(setting)}>
                {setting}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {activeFeature === "Theme" ? (
        <ThemeSettingsModal onClose={() => setActiveFeature(null)} />
      ) : activeFeature ? (
        <SettingsModal 
          featureName={activeFeature} 
          onClose={() => setActiveFeature(null)} 
        />
      ) : null}
    </>
  );
}
