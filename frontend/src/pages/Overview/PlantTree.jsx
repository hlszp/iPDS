import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';

export default function PlantTree({ onSelect }) {
  const [data, setData] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.getPlantTree()
      .then((d) => {
        setData(d.plants || []);
        if (d.plants?.length <= 1) {
          const p = d.plants[0];
          setExpanded({ [`p-${p.id}`]: true });
          if (p.devices?.length <= 1) setExpanded((prev) => ({ ...prev, [`d-${p.devices[0]?.id}`]: true }));
        }
      })
      .catch(() => setData([]));
  }, []);

  const toggle = (key) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const select = (type, id) => {
    const key = `${type}-${id}`;
    setSelected(key);
    onSelect && onSelect({ type, id });
  };

  if (data.length === 0) return <div style={{ padding: 12, color: 'var(--text-dim)', fontSize: 12 }}>加载中...</div>;

  return (
    <div style={{ fontSize: 13 }}>
      {data.map((plant) => (
        <div key={`p-${plant.id}`} style={{ marginBottom: 4 }}>
          <div onClick={() => { toggle(`p-${plant.id}`); select('plant', plant.id); }}
            style={{ ...st.item, fontWeight: 700, color: selected === `plant-${plant.id}` ? 'var(--accent)' : '#fff' }}>
            <span style={st.caret}>{expanded[`p-${plant.id}`] ? '▼' : '▶'}</span>
            {plant.name}
          </div>
          {expanded[`p-${plant.id}`] && plant.devices.map((device) => (
            <div key={`d-${device.id}`} style={{ marginLeft: 16 }}>
              <div onClick={() => { toggle(`d-${device.id}`); select('device', device.id); }}
                style={{ ...st.item, color: selected === `device-${device.id}` ? 'var(--accent)' : 'var(--text)' }}>
                <span style={st.caret}>{expanded[`d-${device.id}`] ? '▼' : '▶'}</span>
                {device.name}
              </div>
              {expanded[`d-${device.id}`] && device.loop_groups.map((grp) => (
                <div key={`g-${grp.id}`} style={{ marginLeft: 16 }}
                  onClick={() => select('group', grp.id)}>
                  <div style={{ ...st.item, color: selected === `group-${grp.id}` ? 'var(--accent)' : 'var(--text-dim)', fontSize: 12 }}>
                    {grp.name} <span style={{ opacity: 0.5 }}>({grp.loops.length})</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const st = {
  item: { padding: '3px 0', cursor: 'pointer', userSelect: 'none' },
  caret: { display: 'inline-block', width: 14, fontSize: 9, color: 'var(--text-dim)' },
};
