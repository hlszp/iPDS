export default function EventTimeline({ events }) {
  const colors = { warn: 'var(--accent)', ok: 'var(--green)', info: 'var(--text-dim)' };
  const icons = { warn: '⚠', ok: '✓', info: '●' };
  return <div style={{fontSize:'var(--font-sm)',lineHeight:1.8}}>
    {events.map((e,i)=>(
      <div key={i} style={{padding:'4px 0',borderBottom:'1px solid rgba(255,255,255,0.03)'}}>
        <span style={{fontWeight:600,marginRight:6,color:colors[e.type]}}>{icons[e.type]} {e.time}</span>
        <span>{e.title}</span>
        {e.meta && <div style={{color:'var(--text-dim)',fontSize:'var(--font-sm)',marginTop:1,paddingLeft:42}}>{e.meta}</div>}
      </div>
    ))}
  </div>;
}
