                  <div style={{ fontSize: 11, color: "#666", marginTop: 5 }}>Dibayar ke vendor: <strong>{formatRupiah(Number(item.nominal_vendor || 0))}</strong></div>
                </div>
              </div>
              {item.calculation_data && (
                <details style={{ borderTop: "1px solid #f0f0f0", background: "#fafafa" }}>
                  <summary style={{ padding: "10px 18px", cursor: "pointer", color: "#c8102e", fontSize: 12, fontWeight: 800 }}>Lihat detail perhitungan</summary>
                  <div style={{ padding: "0 18px 14px", display: "grid", gap: 0 }}>
                    <HistoryDetailRow label="Jenis Wajib Pajak" value={item.calculation_data.state.wpType === "orang_pribadi" ? "Orang Pribadi (KTP)" : item.calculation_data.state.wpType === "badan_dalam" ? "Badan Dalam Negeri (NPWP)" : "Badan Luar Negeri"} />
                    <HistoryDetailRow label="DPP Jasa" value={formatRupiah(item.calculation_data.dppJasaNum)} />
                    <HistoryDetailRow label="DPP Barang" value={formatRupiah(item.calculation_data.dppBarangNum)} />
                    <HistoryDetailRow label="PPN" value={item.calculation_data.state.ppnStatus === "ada" ? formatRupiah(item.calculation_data.ppnNum) : "Rp 0 (Tidak ada PPN)"} />
                    <HistoryDetailRow label="Nominal Dibayar ke Vendor" value={formatRupiah(item.calculation_data.nominalVendor)} highlight />
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryDetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 12 }}>
      <span style={{ color: "#777" }}>{label}</span>
      <span style={{ color: highlight ? "#c8102e" : "#222", fontWeight: 800, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, border: "2px solid #e0e0e0", overflow: "hidden", boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "16px 24px", borderBottom: "2px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10 }}>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "#c8102e", letterSpacing: "0.1em", textTransform: "uppercase" }}>{title}</div>
          <div style={{ fontWeight: 900, fontSize: 18, color: "#0f0f0f", marginTop: 1 }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px", background: "#f9f9f9", border: "1px solid #e0e0e0", borderLeft: "3px solid #c8102e", borderRadius: 6, fontSize: 13, color: "#555" }}>
      {children}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "#888", letterSpacing: "0.12em", textTransform: "uppercase", padding: "16px 0 6px", borderBottom: "1px solid #f0f0f0", marginBottom: 0 }}>
      {children}
    </div>
  );
}

function ResultRow({ label, value, highlight, mono, indent }: {
  label: string; value: string; highlight?: boolean; mono?: boolean; indent?: boolean;
}) {
  return (
    <div className="print-result-row" style={{
      display: "grid",
      gridTemplateColumns: "minmax(150px, 32%) minmax(0, 1fr)",
      columnGap: 20,
      alignItems: "start",
      padding: `${indent ? "6px" : "10px"} ${indent ? "8px" : "0"}`,
      borderBottom: "1px solid #f5f5f5",
      background: indent ? "#fafafa" : "transparent",
    }}>
      <span className="print-result-label" style={{
        fontSize: 13,
        color: highlight ? "#c8102e" : "#666",
        fontWeight: highlight ? 800 : 500,
        minWidth: 0,
      }}>{label}</span>
      <span className="print-result-value" style={{
        fontSize: 13,
        fontWeight: highlight ? 800 : 700,
        fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
        color: highlight ? "#c8102e" : "#0f0f0f",
        textAlign: "right",
        minWidth: 0,
        whiteSpace: "normal",
        overflowWrap: "anywhere",
        wordBreak: "break-word",
      }}>{value}</span>
    </div>
  );
}

function NextButton({ disabled, onClick, label = "Lanjut →" }: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        flex: 1, padding: "13px 24px",
        background: disabled ? "#e0e0e0" : "#c8102e",
        color: disabled ? "#aaa" : "#fff",
        border: "none", borderRadius: 8,
        fontWeight: 800, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "'Nunito', sans-serif", transition: "background 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "13px 20px",
        background: "#fff", color: "#666",
        border: "2px solid #e0e0e0", borderRadius: 8,
        fontWeight: 700, fontSize: 14, cursor: "pointer",
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      ← Kembali
    </button>
  );
}
