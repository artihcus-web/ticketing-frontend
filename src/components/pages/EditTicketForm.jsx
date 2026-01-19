import { useState, useEffect } from 'react';
import { apiRequest } from '../../utils/api.js';
import {
  Plus, Trash2, Edit2, Save, XCircle, Layers, List,
  Tag, Check, AlertCircle, Type, AlignLeft, Hash,
  ChevronRight, GripVertical, Palette, Settings
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const defaultFields = [
  { id: 'subject', label: 'Subject', type: 'text', required: true },
  { id: 'description', label: 'Description', type: 'textarea', required: true },
  { id: 'typeOfIssue', label: 'Type of Issue', type: 'dropdown', required: true, options: ['Incident', 'Service request', 'Change request'] },
];

const toObjArr = (arr) => (arr || []).map(val =>
  typeof val === 'object'
    ? { id: uuidv4(), value: val.value, color: val.color || '#888' }
    : { id: uuidv4(), value: val, color: '#888' }
);
const toStrArr = arr => (arr || []).map(obj => obj.value);
const toDropdownArr = arr => (arr || []).map(obj => ({ value: obj.value, color: obj.color }));

export default function EditTicketForm() {
  const [fields, setFields] = useState(defaultFields.filter(f => f.id !== 'priority'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [moduleOptions, setModuleOptions] = useState(toObjArr(['EWM', 'BTP', 'TM']));
  const [categoryOptions, setCategoryOptions] = useState({
    EWM: toObjArr(['Inbound', 'Outbound', 'Internal']),
    BTP: toObjArr(['d', 'e', 'f']),
    TM: toObjArr(['g', 'h', 'i'])
  });
  const [subCategoryOptions, setSubCategoryOptions] = useState({
    Inbound: toObjArr(['Putaway', 'Goods Receipt']),
    Outbound: toObjArr(['Picking', 'Packing']),
    Internal: toObjArr(['Stock Transfer']),
    d: toObjArr(['d1', 'd2']),
    e: toObjArr(['e1', 'e2']),
    f: toObjArr(['f1', 'f2']),
    g: toObjArr(['g1', 'g2']),
    h: toObjArr(['h1', 'h2']),
    i: toObjArr(['i1', 'i2'])
  });
  const [editFieldIdx, setEditFieldIdx] = useState(null);
  const [editModuleIdx, setEditModuleIdx] = useState(null);
  const [editCategory, setEditCategory] = useState({ mod: null, idx: null });
  const [editSubCategory, setEditSubCategory] = useState({ cat: null, idx: null });

  // Load config from backend
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const response = await apiRequest('/tickets/config/formConfig', {
          method: 'GET',
        });

        if (response.success && response.formConfig) {
          // All dropdown fields: support color
          const loadedFields = response.formConfig.fields || defaultFields;
          setFields(loadedFields.map(f => {
            if (f.type === 'dropdown' && Array.isArray(f.options)) {
              return { ...f, options: toObjArr(f.options) };
            }
            return f;
          }));
          setModuleOptions(toObjArr(response.formConfig.moduleOptions || ['EWM', 'BTP', 'TM']));
          const catOpt = {};
          Object.entries(response.formConfig.categoryOptions || {}).forEach(([mod, arr]) => {
            catOpt[mod] = toObjArr(arr);
          });
          setCategoryOptions(catOpt);
          const subOpt = {};
          Object.entries(response.formConfig.subCategoryOptions || {}).forEach(([cat, arr]) => {
            subOpt[cat] = toObjArr(arr);
          });
          setSubCategoryOptions(subOpt);
        } else {
          // If not exists, create default
          const defaultConfig = {
            fields: defaultFields,
            moduleOptions: ['EWM', 'BTP', 'TM'],
            categoryOptions: { EWM: ['Inbound', 'Outbound', 'Internal'], BTP: ['d', 'e', 'f'], TM: ['g', 'h', 'i'] },
            subCategoryOptions: { Inbound: ['Putaway', 'Goods Receipt'], Outbound: ['Picking', 'Packing'], Internal: ['Stock Transfer'], d: ['d1', 'd2'], e: ['e1', 'e2'], f: ['f1', 'f2'], g: ['g1', 'g2'], h: ['h1', 'h2'], i: ['i1', 'i2'] }
          };

          await apiRequest('/tickets/config/formConfig', {
            method: 'PUT',
            body: JSON.stringify(defaultConfig),
          });

          setModuleOptions(toObjArr(['EWM', 'BTP', 'TM']));
          setCategoryOptions({ EWM: toObjArr(['Inbound', 'Outbound', 'Internal']), BTP: toObjArr(['d', 'e', 'f']), TM: toObjArr(['g', 'h', 'i']) });
          setSubCategoryOptions({ Inbound: toObjArr(['Putaway', 'Goods Receipt']), Outbound: toObjArr(['Picking', 'Packing']), Internal: toObjArr(['Stock Transfer']), d: toObjArr(['d1', 'd2']), e: toObjArr(['e1', 'e2']), f: toObjArr(['f1', 'f2']), g: toObjArr(['g1', 'g2']), h: toObjArr(['h1', 'h2']), i: toObjArr(['i1', 'i2']) });
        }
      } catch (error) {
        console.error('Error loading config:', error);
        setStatus('Failed to load config');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Field Handlers
  const addField = () => {
    setFields([
      ...fields,
      { id: 'field_' + Date.now(), label: 'New Field', type: 'text', required: false }
    ]);
  };
  const removeField = (index) => {
    setFields(fields.filter((_, i) => i !== index));
  };
  const updateField = (index, key, value) => {
    setFields(fields.map((f, i) => {
      if (i === index) {
        let newId = f.id;
        if (key === 'label' && typeof value === 'string' && value.trim().toLowerCase() === 'priority') {
          newId = 'priority';
        }
        return { ...f, [key]: value, id: newId };
      }
      return f;
    }));
  };
  // All dropdowns: add option with color
  const addOption = (index) => {
    setFields(fields.map((f, i) => {
      if (i === index) {
        if (f.type === 'dropdown') {
          return {
            ...f,
            options: [
              ...(f.options || []),
              { value: 'New Option', color: '#888', id: uuidv4() }
            ]
          };
        } else {
          return { ...f, options: [...(f.options || []), 'New Option'] };
        }
      }
      return f;
    }));
  };
  // All dropdowns: update option value or color
  const updateOption = (fieldIdx, optIdx, value, color) => {
    setFields(fields.map((f, i) => {
      if (i === fieldIdx) {
        if (f.type === 'dropdown') {
          return {
            ...f,
            options: f.options.map((o, j) =>
              j === optIdx ? { ...o, value: value !== undefined ? value : o.value, color: color !== undefined ? color : o.color } : o
            )
          };
        } else {
          return { ...f, options: f.options.map((o, j) => j === optIdx ? value : o) };
        }
      }
      return f;
    }));
  };
  // All dropdowns: remove option
  const removeOption = (fieldIdx, optIdx) => {
    setFields(fields.map((f, i) => {
      if (i === fieldIdx) {
        if (f.type === 'dropdown') {
          return { ...f, options: f.options.filter((_, j) => j !== optIdx) };
        } else {
          return { ...f, options: f.options.filter((_, j) => j !== optIdx) };
        }
      }
      return f;
    }));
  };

  // Module Handlers
  const addModule = () => setModuleOptions([...moduleOptions, { id: uuidv4(), value: 'New Module' }]);
  const updateModule = (idx, value) => {
    const newModules = [...moduleOptions];
    newModules[idx].value = value;
    setModuleOptions(newModules);
  };
  const removeModule = idx => {
    const mod = moduleOptions[idx].value;
    setModuleOptions(moduleOptions.filter((_, i) => i !== idx));
    const newCat = { ...categoryOptions };
    delete newCat[mod];
    setCategoryOptions(newCat);
  };

  // Category Handlers
  const addCategory = mod => setCategoryOptions({ ...categoryOptions, [mod]: [...(categoryOptions[mod] || []), { id: uuidv4(), value: 'New Category' }] });
  const updateCategory = (mod, cidx, value) => {
    const newCats = [...(categoryOptions[mod] || [])];
    newCats[cidx].value = value;
    setCategoryOptions({ ...categoryOptions, [mod]: newCats });
  };
  const removeCategory = (mod, cidx) => {
    const cat = categoryOptions[mod][cidx].value;
    const newCats = (categoryOptions[mod] || []).filter((_, i) => i !== cidx);
    setCategoryOptions({ ...categoryOptions, [mod]: newCats });
    const newSub = { ...subCategoryOptions };
    delete newSub[cat];
    setSubCategoryOptions(newSub);
  };

  // Sub-Category Handlers
  const addSubCategory = cat => setSubCategoryOptions({ ...subCategoryOptions, [cat]: [...(subCategoryOptions[cat] || []), { id: uuidv4(), value: 'New Sub-Category' }] });
  const updateSubCategory = (cat, sidx, value) => {
    const newSubs = [...(subCategoryOptions[cat] || [])];
    newSubs[sidx].value = value;
    setSubCategoryOptions({ ...subCategoryOptions, [cat]: newSubs });
  };
  const removeSubCategory = (cat, sidx) => {
    const newSubs = (subCategoryOptions[cat] || []).filter((_, i) => i !== sidx);
    setSubCategoryOptions({ ...subCategoryOptions, [cat]: newSubs });
  };

  // Save config to backend
  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);
    setStatus('');
    try {
      // Convert object arrays to string arrays for backend
      const modStr = toStrArr(moduleOptions);
      const catStr = {};
      Object.entries(categoryOptions).forEach(([mod, arr]) => { catStr[mod] = toStrArr(arr); });
      const subStr = {};
      Object.entries(subCategoryOptions).forEach(([cat, arr]) => { subStr[cat] = toStrArr(arr); });
      // For fields, convert dropdown options to {value, color}, others to string
      const saveFields = fields.map(f => {
        if (f.type === 'dropdown') {
          return { ...f, options: toDropdownArr(f.options) };
        } else {
          return { ...f, options: toStrArr(f.options) };
        }
      });

      const response = await apiRequest('/tickets/config/formConfig', {
        method: 'PUT',
        body: JSON.stringify({
          fields: saveFields.filter(f => !['module', 'category', 'subCategory'].includes(f.id)),
          moduleOptions: modStr,
          categoryOptions: catStr,
          subCategoryOptions: subStr
        }),
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to save');
      }

      setStatus('Saved!');
    } catch (error) {
      console.error('Error saving config:', error);
      setStatus('Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setStatus(''), 2000);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
        </div>
      </div>
      <p className="mt-4 text-slate-500 font-medium animate-pulse">Loading configuration...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8 animate-in fade-in duration-500">
      {/* Header Panel */}
      <div className="bg-white rounded-3xl p-8 mb-8 shadow-sm border border-slate-200/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 -mr-16 -mt-16 bg-gradient-to-br from-blue-50 to-indigo-100 w-64 h-64 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                <Settings className="w-6 h-6" />
              </div>
              Ticket Configuration
            </h1>
            <p className="text-slate-500 mt-2 text-lg">
              Customize your ticket form fields and system categorization.
            </p>
          </div>
          <div className="flex items-center gap-4">
            {status && (
              <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-right-4 fade-in duration-300 ${status === 'Saved!' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                }`}>
                {status === 'Saved!' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {status}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className={`
                        px-8 py-3 rounded-xl font-bold text-white shadow-xl flex items-center gap-2 transition-all duration-300
                        ${saving
                  ? 'bg-slate-400 cursor-not-allowed transform-none'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/25 active:scale-95'
                }
                    `}
            >
              {saving ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <Save className="w-5 h-5" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10">

        {/* Fields Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Custom Fields</h2>
                <p className="text-slate-400 text-sm font-medium">Define the data collected in your tickets</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addField}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl font-semibold transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              Add New Field
            </button>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 gap-6">
            {fields.filter(f => !['module', 'category', 'subCategory'].includes(f.id)).map((field, idx) => (
              <div
                key={field.id}
                className={`
                            group relative rounded-2xl border transition-all duration-300
                            ${editFieldIdx === idx
                    ? 'bg-white border-blue-500/30 shadow-xl shadow-blue-500/5 ring-4 ring-blue-500/5 z-10'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                  }
                        `}
              >
                {editFieldIdx === idx ? (
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Field Label</label>
                        <input
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          value={field.label}
                          onChange={e => updateField(idx, 'label', e.target.value)}
                          placeholder="Enter label..."
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1 w-1/3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Type</label>
                        <div className="relative">
                          <select
                            className="w-full appearance-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={field.type}
                            onChange={e => updateField(idx, 'type', e.target.value)}
                          >
                            <option value="text">Text Input</option>
                            <option value="textarea">Text Area</option>
                            <option value="dropdown">Dropdown</option>
                          </select>
                          <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${field.required ? 'bg-blue-500 border-blue-500' : 'bg-white border-slate-300'}`}>
                        {field.required && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={field.required}
                        onChange={e => updateField(idx, 'required', e.target.checked)}
                      />
                      <span className="text-sm font-medium text-slate-600">This field is required</span>
                    </label>

                    {field.type === 'dropdown' && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dropdown Options</span>
                          <button
                            className="text-blue-600 text-xs font-bold bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                            onClick={() => addOption(idx)}
                            type="button"
                          >
                            <Plus className="w-3 h-3" /> Add Option
                          </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                          {(field.options || []).map((opt, optIdx) => (
                            <div key={opt.id || optIdx} className="flex gap-2 items-center group/opt">
                              <div className="relative flex-1">
                                <input
                                  className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200 rounded-md text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none"
                                  value={typeof opt === 'object' ? opt.value : opt}
                                  onChange={e => updateOption(idx, optIdx, e.target.value, undefined)}
                                  placeholder="Option value"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                  <div className="h-4 w-[1px] bg-slate-200 mx-1"></div>
                                  <label className="cursor-pointer rounded-full hover:ring-2 ring-offset-1 ring-slate-200 transition-all p-0.5" title="Option Color">
                                    <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: opt.color || '#888' }}></div>
                                    <input
                                      type="color"
                                      className="w-0 h-0 opacity-0 absolute"
                                      value={opt.color || '#888'}
                                      onChange={e => updateOption(idx, optIdx, undefined, e.target.value)}
                                    />
                                  </label>
                                </div>
                              </div>
                              <button
                                className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-all"
                                onClick={() => removeOption(idx, optIdx)}
                                type="button"
                                title="Remove Option"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(!field.options || field.options.length === 0) && (
                            <div className="text-center py-3 text-sm text-slate-400 italic bg-slate-50 rounded-lg">No options addded</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-4 pt-2">
                      <button
                        className="flex-1 bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                        type="button"
                        onClick={() => setEditFieldIdx(null)}
                      >
                        <Check className="w-4 h-4" /> Done
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${field.type === 'dropdown' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {field.type === 'dropdown' ? <List className="w-5 h-5" /> : field.type === 'textarea' ? <AlignLeft className="w-5 h-5" /> : <Type className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800">{field.label}</h3>
                          {field.required && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-wide">Required</span>}
                        </div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{field.type}</p>
                        {field.type === 'dropdown' && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(field.options || []).slice(0, 3).map((opt, i) => (
                              <span key={i} className="inline-flex items-center gap-1.5 text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-full border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (typeof opt === 'object' ? opt.color : undefined) || '#94a3b8' }}></span>
                                {typeof opt === 'object' ? opt.value : opt}
                              </span>
                            ))}
                            {(field.options || []).length > 3 && (
                              <span className="text-[10px] bg-slate-50 text-slate-400 px-2 py-1 rounded-full border border-slate-200">+{field.options.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" type="button" onClick={() => setEditFieldIdx(idx)}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" type="button" onClick={() => removeField(idx)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Cascading Dropdowns Section */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex items-center gap-4">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Cascading Dropdowns</h2>
              <p className="text-slate-400 text-sm font-medium">Configure hierarchy: Module {'->'} Category {'->'} Sub-Category</p>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Modules Column */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> 1. Modules
                  </h4>
                  <button onClick={addModule} type="button" className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  {moduleOptions.map((mod, idx) => (
                    <div key={mod.id} className="group relative">
                      {editModuleIdx === idx ? (
                        <div className="flex items-center gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                          <input
                            className="w-full bg-white border-blue-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            value={mod.value}
                            onChange={e => updateModule(idx, e.target.value)}
                            autoFocus
                          />
                          <button className="text-emerald-600 hover:bg-emerald-100 p-1 rounded" onClick={() => setEditModuleIdx(null)}><Check className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group-hover:scale-[1.02]">
                          <span className="font-semibold text-slate-700">{mod.value}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="text-slate-400 hover:text-blue-600 p-1" onClick={() => setEditModuleIdx(idx)}><Edit2 className="w-3.5 h-3.5" /></button>
                            <button className="text-slate-400 hover:text-red-500 p-1" onClick={() => removeModule(idx)}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Categories Column */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span> 2. Categories & 3. Sub-Categories
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {moduleOptions.map(mod => (
                    <div key={mod.id} className="bg-slate-50/50 rounded-2xl border border-slate-200 p-5 hover:bg-slate-50 transition-colors">
                      <h5 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-500" />
                        {mod.value}
                      </h5>

                      <div className="space-y-4">
                        {(categoryOptions[mod.value] || []).map((cat, cidx) => (
                          <div key={cat.id} className="relative pl-4 border-l-2 border-indigo-100 hover:border-indigo-300 transition-colors">
                            {/* Category Item */}
                            <div className="group flex items-center gap-2 mb-2">
                              {editCategory.mod === mod.value && editCategory.idx === cidx ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <input
                                    className="flex-1 min-w-0 bg-white border border-indigo-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    value={cat.value}
                                    onChange={e => updateCategory(mod.value, cidx, e.target.value)}
                                    autoFocus
                                  />
                                  <button className="text-emerald-600 p-1" onClick={() => setEditCategory({ mod: null, idx: null })}><Check className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center justify-between">
                                  <span className="text-sm font-bold text-indigo-900/80">{cat.value}</span>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-slate-400 hover:text-blue-600 p-1" onClick={() => setEditCategory({ mod: mod.value, idx: cidx })}><Edit2 className="w-3 h-3" /></button>
                                    <button className="text-slate-400 hover:text-red-500 p-1" onClick={() => removeCategory(mod.value, cidx)}><Trash2 className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* SubCategories List */}
                            <div className="space-y-1.5 pl-2 mb-3">
                              {(subCategoryOptions[cat.value] || []).map((sub, sidx) => (
                                <div key={sub.id} className="flex items-center gap-2 group/sub">
                                  <div className="w-3 h-[1px] bg-indigo-200"></div>
                                  {editSubCategory.cat === cat.value && editSubCategory.idx === sidx ? (
                                    <div className="flex-1 flex items-center gap-1">
                                      <input
                                        className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-indigo-400"
                                        value={sub.value}
                                        onChange={e => updateSubCategory(cat.value, sidx, e.target.value)}
                                        autoFocus
                                      />
                                      <button className="text-emerald-600 hover:bg-emerald-50 rounded p-0.5" onClick={() => setEditSubCategory({ cat: null, idx: null })}><Check className="w-3 h-3" /></button>
                                    </div>
                                  ) : (
                                    <div className="flex-1 flex items-center justify-between py-0.5 px-2 rounded hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                                      <span className="text-xs text-slate-600">{sub.value}</span>
                                      <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                        <button className="text-slate-300 hover:text-blue-600" onClick={() => setEditSubCategory({ cat: cat.value, idx: sidx })}><Edit2 className="w-3 h-3" /></button>
                                        <button className="text-slate-300 hover:text-red-500" onClick={() => removeSubCategory(cat.value, sidx)}><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button
                                className="ml-5 text-[10px] uppercase font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1 mt-1 transition-colors"
                                onClick={() => addSubCategory(cat.value)}
                              >
                                <Plus className="w-3 h-3" /> Add sub-item
                              </button>
                            </div>
                          </div>
                        ))}
                        <button
                          className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-xs font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2"
                          onClick={() => addCategory(mod.value)}
                        >
                          <Plus className="w-3 h-3" /> New Category
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}