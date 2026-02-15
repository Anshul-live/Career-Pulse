
import React from "react";

const InputField = ({ label, type, placeholder, value, onChange,name }) => {
  return (
    <div className="mb-4">
      <label className="block text-gray-700 font-semibold mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default InputField;
