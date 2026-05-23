export default function Top10Table({ data, onRowClick }) {
  const gradeDot = g => ({display:'inline-block',width:7,height:7,borderRadius:'50%',marginRight:5,background:g==='D'?'var(--red)':'var(--yellow)'});
  const faultTag = c => ({display:'inline-block',padding:'2px 6px',borderRadius:3,fontSize:'var(--font-sm)',marginRight:3,fontWeight:500,
    background:c==='stiction'?'rgba(231,76,60,0.2)':c==='osc'?'rgba(241,196,15,0.2)':'rgba(127,140,141,0.15)',
    color:c==='stiction'?'var(--red)':c==='osc'?'var(--yellow)':'var(--gray)'});

  return (
    <table style={{width:'100%',fontSize:'var(--font-sm)',borderCollapse:'collapse'}}>
      <thead><tr>
        <th style={{textAlign:'left',padding:'5px 8px',color:'var(--text-dim)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>#</th>
        <th style={{textAlign:'left',padding:'5px 8px',color:'var(--text-dim)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>位号</th>
        <th style={{textAlign:'left',padding:'5px 8px',color:'var(--text-dim)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>装置</th>
        <th style={{textAlign:'left',padding:'5px 8px',color:'var(--text-dim)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>评级</th>
        <th style={{textAlign:'left',padding:'5px 8px',color:'var(--text-dim)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>主要故障</th>
        <th style={{textAlign:'left',padding:'5px 8px',color:'var(--text-dim)',fontWeight:500,borderBottom:'1px solid var(--border)'}}>问题权重</th>
      </tr></thead>
      <tbody>
        {data.map((r,i)=>(
          <tr key={r.tag} onClick={()=>onRowClick(r)} style={{cursor:'pointer',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
            <td style={{padding:'7px 8px'}}>{i+1}</td>
            <td style={{padding:'7px 8px',color:'#fff',fontWeight:600}}>{r.tag}</td>
            <td style={{padding:'7px 8px'}}>{r.unit}</td>
            <td style={{padding:'7px 8px'}}><span style={gradeDot(r.grade)}/>{r.grade==='D'?'差':'中'}</td>
            <td style={{padding:'7px 8px'}}>{r.faults.map(f=><span key={f.t} style={faultTag(f.c)}>{f.t}</span>)}</td>
            <td style={{padding:'7px 8px'}}>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div style={{width:r.w*10,height:6,borderRadius:3,background:r.grade==='D'?'var(--red)':'var(--yellow)'}}/>
                <span style={{fontSize:'var(--font-sm)',color:'var(--text-dim)'}}>{r.w}</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
