import React, { useState } from "react";
import { cn } from "../../lib/utils";

export function Tabs({ defaultValue, children, className, onValueChange }) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (onValueChange) onValueChange(value);
  };

  return (
    <div className={cn(className)}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          activeTab,
          setActiveTab: handleTabChange,
        })
      )}
    </div>
  );
}

export function TabList({ children, className, activeTab, setActiveTab }) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {React.Children.map(children, (child) =>
        React.cloneElement(child, {
          onClick: () => setActiveTab(child.props.value),
        })
      )}
    </div>
  );
}

export function Tab({ children, value, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={cn(className)}
    >
      {children}
    </button>
  );
}

export function TabContent({ children, value, activeTab, className }) {
  if (value !== activeTab) return null;
  return <div className={cn(className)}>{children}</div>;
}
