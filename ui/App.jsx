// App shell for Universal Hotbox OS MVP
// Loads config, manages overlay, handles global hotkey, and executes commands

import React, { useState, useEffect } from 'react';
import RadialMenu from './RadialMenu.jsx';
import fallbackConfig from '../config/hotbox.json';
import fallbackUIStyle from '../config/ui-style.json';

const UI_STYLE_SECTIONS = [
  {
    title: 'Colors',
    fields: [
      { key: 'BgColor', label: 'BgColor', type: 'color' },
      { key: 'TreeViewBg', label: 'TreeViewBg', type: 'color' },
      { key: 'TreeViewText', label: 'TreeViewText', type: 'color' },
      { key: 'Level0', label: 'Level0', type: 'color' },
      { key: 'Level1', label: 'Level1', type: 'color' },
      { key: 'Level2', label: 'Level2', type: 'color' },
      { key: 'Level3', label: 'Level3', type: 'color' },
      { key: 'Highlight', label: 'Highlight', type: 'color' },
    ],
  },
  {
    title: 'Opacity',
    fields: [
      { key: 'RadialOpacity', label: 'RadialOpacity', type: 'number' },
      { key: 'RadialHoverOpacity', label: 'RadialHoverOpacity', type: 'number' },
      { key: 'CenterGrayOpacity', label: 'CenterGrayOpacity', type: 'number' },
      { key: 'TopRightMenuOpacity', label: 'TopRightMenuOpacity', type: 'number' },
    ],
  },
  {
    title: 'Radius',
    fields: [
      { key: 'InitialRadius', label: 'InitialRadius', type: 'number' },
      { key: 'RadiusMin', label: 'RadiusMin', type: 'number' },
      { key: 'RadiusMax', label: 'RadiusMax', type: 'number' },
      { key: 'RadiusScaleStep', label: 'RadiusScaleStep', type: 'number' },
    ],
  },
  {
    title: 'Hover',
    fields: [
      { key: 'HoverNavigateEnabled', label: 'HoverNavigateEnabled', type: 'boolean' },
      { key: 'HoverNavigateDelayMs', label: 'HoverNavigateDelayMs', type: 'number' },
      { key: 'HoverNavigateMaxMovePx', label: 'HoverNavigateMaxMovePx', type: 'number' },
    ],
  },
];

const App = () => {
  const [configData, setConfigData] = useState(fallbackConfig);
  const [uiStyleData, setUIStyleData] = useState(fallbackUIStyle);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [currentMenu, setCurrentMenu] = useState((fallbackConfig.menus || [])[0] || null);
  const [menuStack, setMenuStack] = useState(['Main']);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedMenuName, setSelectedMenuName] = useState('Main');
  const [newMenuName, setNewMenuName] = useState('');
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemTarget, setNewItemTarget] = useState('');
  const [newItemAction, setNewItemAction] = useState('open_folder');
  const [selectedItemIndex, setSelectedItemIndex] = useState(-1);
  const [uiStyleOpen, setUIStyleOpen] = useState(true);
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  const [menuEditorOpen, setMenuEditorOpen] = useState(true);

  const getMenuByName = (name, menus = configData.menus || []) => {
    return menus.find(m => m.name === name) || menus[0] || null;
  };

  // Load menu config from main process parser (config/folders.txt)
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (window.hotboxAPI && window.hotboxAPI.getConfig) {
        const loaded = await window.hotboxAPI.getConfig();
        if (!mounted || !loaded || !loaded.menus || !loaded.menus.length) return;
        setConfigData(loaded);
        setCurrentMenu(getMenuByName('Main', loaded.menus));
      }
      if (window.hotboxAPI && window.hotboxAPI.getUIStyle) {
        const loadedUIStyle = await window.hotboxAPI.getUIStyle();
        if (!mounted || !loadedUIStyle) return;
        setUIStyleData(loadedUIStyle);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // React to visibility pushed by main process (global shortcut Shift+Space)
  useEffect(() => {
    let cleanup = null;
    if (window.hotboxAPI && window.hotboxAPI.onVisibleChanged) {
      cleanup = window.hotboxAPI.onVisibleChanged((visible) => {
        setOverlayVisible(visible);
        if (visible) {
          setMenuStack(['Main']);
          setCurrentMenu(getMenuByName('Main'));
          setEditorOpen(false);
        }
      });
    }
    return () => {
      if (cleanup) cleanup();
    };
  }, [configData]);

  useEffect(() => {
    if (!currentMenu && configData.menus && configData.menus.length) {
      setCurrentMenu(getMenuByName('Main'));
    }
  }, [configData, currentMenu]);

  // Escape closes hotbox or goes back in submenu.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Escape' && overlayVisible) {
        if (menuStack.length > 1) {
          const newStack = menuStack.slice(0, -1);
          setMenuStack(newStack);
          setCurrentMenu(getMenuByName(newStack[newStack.length - 1]));
          return;
        }
        setOverlayVisible(false);
        if (window.hotboxAPI && window.hotboxAPI.hideHotbox) {
          window.hotboxAPI.hideHotbox();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [overlayVisible, menuStack, configData]);

  // Command execution logic
  const handleSelect = async (slice, idx, meta = { trigger: 'click' }) => {
    if (!slice) return;
    if (slice.action === 'submenu') {
      setMenuStack([...menuStack, slice.target]);
      setCurrentMenu(getMenuByName(slice.target));
    } else if (slice.action === 'open_settings') {
      setEditorOpen(true);
      setSelectedMenuName(currentMenu?.name || 'Main');
    } else if (slice.action === 'cancel') {
      setMenuStack(['Main']);
      setCurrentMenu(getMenuByName('Main'));
      setOverlayVisible(false);
      if (window.hotboxAPI && window.hotboxAPI.hideHotbox) {
        window.hotboxAPI.hideHotbox();
      }
    } else {
      // Hide first so dialog-navigation keystrokes target the app, not the hotbox.
      setOverlayVisible(false);
      if (window.hotboxAPI && window.hotboxAPI.hideHotbox) {
        window.hotboxAPI.hideHotbox();
      }
      // Execute command via Electron IPC
      if (window.hotboxAPI && window.hotboxAPI.exec) {
        try {
          const options = {
            trigger: meta?.trigger || 'click',
            preferCurrentWindow: meta?.trigger !== 'click' && slice.action === 'open_folder',
            forceNewWindow: meta?.trigger === 'click' && slice.action === 'open_folder',
          };
          const result = await window.hotboxAPI.exec(slice.action, slice.target, options);
          // Optionally show a notification or toast
          // alert(result);
        } catch (e) {
          // alert('Error: ' + e.message);
        }
      }
      setMenuStack(['Main']);
      setCurrentMenu(getMenuByName('Main'));
    }
  };

  const selectedMenu = getMenuByName(selectedMenuName);

  const addMenu = () => {
    const name = newMenuName.trim();
    if (!name) return;
    if ((configData.menus || []).some((m) => m.name === name)) return;
    const next = {
      menus: [...(configData.menus || []), { name, slices: [] }],
    };
    setConfigData(next);
    setSelectedMenuName(name);
    setNewMenuName('');
  };

  const deleteMenu = () => {
    if (selectedMenuName === 'Main') return;
    const nextMenus = (configData.menus || []).filter((m) => m.name !== selectedMenuName);
    const patchedMenus = nextMenus.map((m) => ({
      ...m,
      slices: (m.slices || []).filter((s) => !(s.action === 'submenu' && s.target === selectedMenuName)),
    }));
    const next = { menus: patchedMenus };
    setConfigData(next);
    setSelectedMenuName('Main');
    setCurrentMenu(getMenuByName('Main', patchedMenus));
  };

  const addItemToSelectedMenu = () => {
    const label = newItemLabel.trim();
    if (!label || !selectedMenu) return;
    const item = {
      label,
      icon: '',
      action: newItemAction,
      target: newItemTarget.trim(),
    };
    const nextMenus = (configData.menus || []).map((m) =>
      m.name === selectedMenu.name ? { ...m, slices: [...(m.slices || []), item] } : m
    );
    setConfigData({ menus: nextMenus });
    setCurrentMenu(getMenuByName(currentMenu?.name || 'Main', nextMenus));
    setNewItemLabel('');
    setNewItemTarget('');
  };

  const updateItemInSelectedMenu = (index, patch) => {
    if (!selectedMenu || index < 0) return;
    const nextMenus = (configData.menus || []).map((m) => {
      if (m.name !== selectedMenu.name) return m;
      const nextSlices = [...(m.slices || [])];
      nextSlices[index] = { ...nextSlices[index], ...patch };
      return { ...m, slices: nextSlices };
    });
    setConfigData({ menus: nextMenus });
    setCurrentMenu(getMenuByName(currentMenu?.name || 'Main', nextMenus));
  };

  const removeItem = (index) => {
    if (!selectedMenu) return;
    const nextMenus = (configData.menus || []).map((m) => {
      if (m.name !== selectedMenu.name) return m;
      const nextSlices = [...(m.slices || [])];
      nextSlices.splice(index, 1);
      return { ...m, slices: nextSlices };
    });
    setConfigData({ menus: nextMenus });
    setCurrentMenu(getMenuByName(currentMenu?.name || 'Main', nextMenus));
  };

  const moveItem = (from, to) => {
    if (!selectedMenu || from < 0) return;
    const items = [...(selectedMenu.slices || [])];
    if (to < 0 || to >= items.length) return;
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    const nextMenus = (configData.menus || []).map((m) =>
      m.name === selectedMenu.name ? { ...m, slices: items } : m
    );
    setConfigData({ menus: nextMenus });
    setSelectedItemIndex(to);
  };

  const lowerLevel = () => {
    if (!selectedMenu || selectedItemIndex < 0) return;
    const item = (selectedMenu.slices || [])[selectedItemIndex];
    if (!item) return;
    let submenuName = item.target;
    if (item.action !== 'submenu') {
      submenuName = `${item.label} Submenu`;
      const exists = (configData.menus || []).some((m) => m.name === submenuName);
      const nextMenus = exists
        ? [...(configData.menus || [])]
        : [...(configData.menus || []), { name: submenuName, slices: [] }];
      const patched = nextMenus.map((m) => {
        if (m.name !== selectedMenu.name) return m;
        const nextSlices = [...(m.slices || [])];
        nextSlices[selectedItemIndex] = { ...nextSlices[selectedItemIndex], action: 'submenu', target: submenuName };
        return { ...m, slices: nextSlices };
      });
      setConfigData({ menus: patched });
      return;
    }
  };

  const upperLevel = () => {
    if (!selectedMenu || selectedItemIndex < 0) return;
    const item = (selectedMenu.slices || [])[selectedItemIndex];
    if (!item || item.action !== 'submenu') return;
    updateItemInSelectedMenu(selectedItemIndex, { action: 'open_folder', target: '' });
  };

  const applyItemFields = () => {
    if (!selectedMenu) return;
    if (selectedItemIndex >= 0) {
      updateItemInSelectedMenu(selectedItemIndex, {
        label: newItemLabel,
        target: newItemTarget,
        action: newItemAction,
      });
      return;
    }
    addItemToSelectedMenu();
  };

  const previewOnly = () => {
    setEditorOpen(false);
  };

  const buildTreeRows = () => {
    const menuMap = new Map((configData.menus || []).map((m) => [m.name, m]));
    const rows = [];
    const visit = (menuName, level, seen) => {
      if (seen.has(menuName)) return;
      seen.add(menuName);
      const menu = menuMap.get(menuName);
      if (!menu) return;
      rows.push({ type: 'menu', level, menuName, label: menu.name });
      (menu.slices || []).forEach((s, idx) => {
        rows.push({ type: 'item', level: level + 1, menuName, itemIndex: idx, label: s.label, action: s.action });
        if (s.action === 'submenu' && s.target) visit(s.target, level + 2, seen);
      });
    };
    visit('Main', 0, new Set());
    return rows;
  };

  const treeRows = buildTreeRows();

  const updateUIStyleField = (key, value, fieldType) => {
    setUIStyleData((prev) => {
      if (fieldType === 'number') {
        if (value === '') return prev;
        const parsed = Number(value);
        return { ...prev, [key]: Number.isNaN(parsed) ? prev[key] : parsed };
      }
      if (fieldType === 'boolean') {
        return { ...prev, [key]: value === 'true' };
      }
      return { ...prev, [key]: value };
    });
  };

  const saveConfig = async () => {
    if (!window.hotboxAPI) return;
    if (window.hotboxAPI.saveConfig) {
      await window.hotboxAPI.saveConfig(configData);
    }
    if (window.hotboxAPI.saveUIStyle) {
      await window.hotboxAPI.saveUIStyle(uiStyleData);
    }
  };

  return (
    <div>
      {/* ...existing code... */}
      {overlayVisible && (
        <RadialMenu
          config={currentMenu}
          onSelect={handleSelect}
          menuLevel={Math.max(0, menuStack.length - 1)}
          uiStyle={uiStyleData}
          editorOpen={editorOpen}
        />
      )}

      {overlayVisible && editorOpen && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: 280,
            height: '100vh',
            overflow: 'auto',
            background: 'rgba(1,7,10,0.98)',
            color: '#fff',
            borderRight: '1px solid #1b2e35',
            borderRadius: '0 10px 10px 0',
            padding: 10,
            zIndex: 10000,
            fontFamily: 'Segoe UI, Arial, sans-serif',
            userSelect: 'none',
            pointerEvents: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 16 }}>Hotbox Style Editor v2.0</strong>
            <button onClick={() => setEditorOpen(false)}>X</button>
          </div>

          {/* ── Menu Editor rollout ── */}
          <div style={{ borderTop: '1px solid #1b2e35', paddingTop: 8, marginBottom: 0 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: menuEditorOpen ? 8 : 0 }}
              onClick={() => setMenuEditorOpen((o) => !o)}
            >
              <span style={{ color: '#39d0d7', fontWeight: 600, fontSize: 13 }}>
                {menuEditorOpen ? '▼' : '▶'} Hotbox Menu Editor
              </span>
            </div>

            {menuEditorOpen && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 6 }}>
                  <button style={{ userSelect: 'none' }} onClick={applyItemFields}>Add</button>
                  <button style={{ userSelect: 'none' }} onClick={() => (selectedItemIndex >= 0 ? removeItem(selectedItemIndex) : deleteMenu())}>Del</button>
                  <button style={{ userSelect: 'none' }} onClick={previewOnly}>Preview</button>
                  <button style={{ userSelect: 'none' }} onClick={saveConfig}>Save File</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                  <button style={{ userSelect: 'none' }} onClick={() => moveItem(selectedItemIndex, selectedItemIndex - 1)}>Move Up</button>
                  <button style={{ userSelect: 'none' }} onClick={() => moveItem(selectedItemIndex, selectedItemIndex + 1)}>Move Down</button>
                  <button style={{ userSelect: 'none' }} onClick={upperLevel}>Upper</button>
                  <button style={{ userSelect: 'none' }} onClick={lowerLevel}>Lower</button>
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    <input
                      placeholder="New menu name"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      style={{ flex: 1, userSelect: 'text' }}
                    />
                    <button style={{ userSelect: 'none' }} onClick={addMenu}>Add Menu</button>
                  </div>
                  <select
                    style={{ width: '100%' }}
                    value={selectedMenuName}
                    onChange={(e) => {
                      setSelectedMenuName(e.target.value);
                      setSelectedItemIndex(-1);
                    }}
                  >
                    {(configData.menus || []).map((m) => (
                      <option key={m.name} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    height: '40vh',
                    minHeight: 180,
                    maxHeight: 480,
                    overflow: 'auto',
                    border: '1px solid #4b5b61',
                    background: '#000b12',
                    padding: 8,
                    marginBottom: 10,
                  }}
                >
                  {treeRows.map((row, i) => {
                    const isSelMenu = row.type === 'menu' && row.menuName === selectedMenuName && selectedItemIndex < 0;
                    const isSelItem = row.type === 'item' && row.menuName === selectedMenuName && row.itemIndex === selectedItemIndex;
                    return (
                      <div
                        key={`${row.type}-${row.menuName}-${row.itemIndex ?? 'm'}-${i}`}
                        onClick={() => {
                          setSelectedMenuName(row.menuName);
                          if (row.type === 'item') {
                            setSelectedItemIndex(row.itemIndex);
                            const it = (getMenuByName(row.menuName)?.slices || [])[row.itemIndex];
                            if (it) {
                              setNewItemLabel(it.label || '');
                              setNewItemTarget(it.target || '');
                              setNewItemAction(it.action || 'open_folder');
                            }
                          } else {
                            setSelectedItemIndex(-1);
                          }
                        }}
                        style={{
                          padding: '2px 4px',
                          marginLeft: row.level * 14,
                          color: row.type === 'menu' ? '#39d0d7' : '#0cb1f2',
                          background: (isSelMenu || isSelItem) ? 'rgba(217,11,28,0.25)' : 'transparent',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          userSelect: 'none',
                        }}
                      >
                        {row.type === 'menu' ? '▣ ' : '└─ '}
                        {row.label}
                      </div>
                    );
                  })}
                </div>

                <div style={{ marginTop: 2 }}>
                  <div style={{ marginBottom: 4 }}>Item Label:</div>
                  <input
                    placeholder="Item Label"
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    style={{ width: '100%', marginBottom: 8, userSelect: 'text' }}
                  />
                  <div style={{ marginBottom: 4 }}>Path / Command:</div>
                  <input
                    placeholder="Path / Command"
                    value={newItemTarget}
                    onChange={(e) => setNewItemTarget(e.target.value)}
                    style={{ width: '100%', marginBottom: 8, userSelect: 'text' }}
                  />
                  <select
                    value={newItemAction}
                    onChange={(e) => setNewItemAction(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="open_folder">open_folder</option>
                    <option value="launch_app">launch_app</option>
                    <option value="run_script">run_script</option>
                    <option value="submenu">submenu</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginTop: 10, borderTop: '1px solid #1b2e35', paddingTop: 8 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', userSelect: 'none', marginBottom: uiStyleOpen ? 8 : 0 }}
              onClick={() => setUIStyleOpen((o) => !o)}
            >
              <span style={{ color: '#39d0d7', fontWeight: 600, fontSize: 13 }}>
                {uiStyleOpen ? '▼' : '▶'} UI Style (ui-style.json)
              </span>
              <span style={{ fontSize: 10, color: '#4b6a70', marginLeft: 'auto' }}>live preview</span>
            </div>
            {uiStyleOpen && (
              <div>
                {UI_STYLE_SECTIONS.map((section) => {
                  const isCollapsed = collapsedSections.has(section.title);
                  return (
                    <div key={section.title} style={{ marginBottom: 6 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', userSelect: 'none', padding: '3px 4px', borderRadius: 4, background: 'rgba(4,217,217,0.06)', marginBottom: isCollapsed ? 0 : 6 }}
                        onClick={() => setCollapsedSections((prev) => {
                          const next = new Set(prev);
                          if (next.has(section.title)) next.delete(section.title);
                          else next.add(section.title);
                          return next;
                        })}
                      >
                        <span style={{ color: '#0cb1f2', fontSize: 12, fontWeight: 600 }}>
                          {isCollapsed ? '▶' : '▼'} {section.title}
                        </span>
                      </div>
                      {!isCollapsed && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, paddingLeft: 4 }}>
                          {section.fields.map((field) => (
                            <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
                              <span style={{ color: '#9ab' }}>{field.label}</span>
                              {field.type === 'color' ? (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <input
                                    type="color"
                                    value={/^#[0-9a-fA-F]{6}$/.test(uiStyleData[field.key]) ? uiStyleData[field.key] : '#000000'}
                                    onChange={(e) => updateUIStyleField(field.key, e.target.value, 'text')}
                                    style={{ width: 32, height: 24, padding: 0, border: '1px solid #1b2e35', borderRadius: 4, cursor: 'pointer', background: 'none', flexShrink: 0 }}
                                  />
                                  <input
                                    type="text"
                                    value={uiStyleData[field.key] ?? ''}
                                    onChange={(e) => updateUIStyleField(field.key, e.target.value, 'text')}
                                    style={{ flex: 1, fontFamily: 'monospace', fontSize: 11 }}
                                  />
                                </div>
                              ) : field.type === 'boolean' ? (
                                <select
                                  value={String(Boolean(uiStyleData[field.key]))}
                                  onChange={(e) => updateUIStyleField(field.key, e.target.value, field.type)}
                                >
                                  <option value="true">true</option>
                                  <option value="false">false</option>
                                </select>
                              ) : (
                                <input
                                  type="number"
                                  step="any"
                                  value={uiStyleData[field.key] ?? ''}
                                  onChange={(e) => updateUIStyleField(field.key, e.target.value, field.type)}
                                />
                              )}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
