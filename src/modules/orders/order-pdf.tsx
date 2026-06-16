import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

/**
 * Auftrags-Dokument (A5.2) in drei Ausprägungen:
 *  - confirmation : Auftragsbestätigung (mit Preisen)
 *  - quote        : Angebot (mit Preisen)
 *  - deliverynote : Lieferschein (ohne Preise, mit Lieferadresse)
 */
export type OrderPdfType = "confirmation" | "deliverynote" | "quote";

export interface OrderPdfItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  netAmount: number;
  grossAmount: number;
}

export interface OrderPdfData {
  type: OrderPdfType;
  title: string;
  number: string;
  issueDate: string;
  showPrices: boolean;
  netTotal: number;
  taxTotal: number;
  grossTotal: number;
  notes: string | null;
  company: {
    companyName: string;
    street: string;
    postalCode: string;
    city: string;
    email: string;
    phone: string;
    taxNumber: string;
    vatId: string;
    footer: string;
    logoDataUri?: string;
  };
  customer: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
    vatId: string;
  };
  shipping: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
  };
  items: OrderPdfItem[];
}

const eur = (v: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(v);

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 9, color: "#1e293b", fontFamily: "Helvetica" },
  logo: { height: 38, marginBottom: 10, objectFit: "contain", alignSelf: "flex-start" },
  senderLine: { fontSize: 7, color: "#64748b", marginBottom: 24 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  h1: { fontSize: 18, fontWeight: "bold", marginBottom: 2 },
  block: { marginBottom: 16 },
  label: { color: "#64748b" },
  meta: { textAlign: "right" },
  table: { marginTop: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },
  th: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: "bold",
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#f1f5f9",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  // Mit Preisen
  cName: { width: "40%" },
  cQty: { width: "10%", textAlign: "right" },
  cPrice: { width: "16%", textAlign: "right" },
  cTax: { width: "10%", textAlign: "right" },
  cNet: { width: "12%", textAlign: "right" },
  cGross: { width: "12%", textAlign: "right" },
  // Lieferschein (ohne Preise)
  dName: { width: "82%" },
  dQty: { width: "18%", textAlign: "right" },
  totals: { marginTop: 12, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    marginTop: 2,
    borderTopWidth: 1,
    borderColor: "#cbd5e1",
    fontWeight: "bold",
    fontSize: 11,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#64748b",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 8,
  },
});

export function OrderPdf({ data }: { data: OrderPdfData }) {
  const c = data.company;
  const k = data.customer;
  const isDelivery = data.type === "deliverynote";
  const addr = isDelivery ? data.shipping : k;

  return (
    <Document title={`${data.title} ${data.number}`}>
      <Page size="A4" style={s.page}>
        {c.logoDataUri ? <Image style={s.logo} src={c.logoDataUri} /> : null}
        <Text style={s.senderLine}>
          {[c.companyName, c.street, `${c.postalCode} ${c.city}`].filter(Boolean).join(" · ")}
        </Text>

        <View style={s.row}>
          <View style={s.block}>
            {isDelivery && <Text style={s.label}>Lieferadresse</Text>}
            <Text style={{ fontWeight: "bold" }}>{addr.name}</Text>
            <Text>{addr.street}</Text>
            <Text>
              {addr.postalCode} {addr.city}
            </Text>
            {!isDelivery && !!k.vatId && <Text style={s.label}>USt-IdNr.: {k.vatId}</Text>}
          </View>
          <View style={s.meta}>
            <Text style={s.h1}>{data.title}</Text>
            <Text>{data.number}</Text>
            <Text style={s.label}>Datum: {data.issueDate}</Text>
          </View>
        </View>

        <View style={s.table}>
          {data.showPrices ? (
            <View style={s.th}>
              <Text style={s.cName}>Produkt</Text>
              <Text style={s.cQty}>Menge</Text>
              <Text style={s.cPrice}>Einzelpreis</Text>
              <Text style={s.cTax}>MwSt</Text>
              <Text style={s.cNet}>Netto</Text>
              <Text style={s.cGross}>Brutto</Text>
            </View>
          ) : (
            <View style={s.th}>
              <Text style={s.dName}>Produkt</Text>
              <Text style={s.dQty}>Menge</Text>
            </View>
          )}

          {data.items.map((it, i) =>
            data.showPrices ? (
              <View style={s.tr} key={i}>
                <Text style={s.cName}>{it.productName}</Text>
                <Text style={s.cQty}>{it.quantity}</Text>
                <Text style={s.cPrice}>{eur(it.unitPrice)}</Text>
                <Text style={s.cTax}>{it.taxRate}%</Text>
                <Text style={s.cNet}>{eur(it.netAmount)}</Text>
                <Text style={s.cGross}>{eur(it.grossAmount)}</Text>
              </View>
            ) : (
              <View style={s.tr} key={i}>
                <Text style={s.dName}>{it.productName}</Text>
                <Text style={s.dQty}>{it.quantity}</Text>
              </View>
            ),
          )}
        </View>

        {data.showPrices && (
          <View style={s.totals}>
            <View style={s.totalRow}>
              <Text style={s.label}>Nettosumme</Text>
              <Text>{eur(data.netTotal)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text style={s.label}>MwSt</Text>
              <Text>{eur(data.taxTotal)}</Text>
            </View>
            <View style={s.totalStrong}>
              <Text>Gesamtbetrag</Text>
              <Text>{eur(data.grossTotal)}</Text>
            </View>
          </View>
        )}

        {!!data.notes && (
          <View style={{ marginTop: 20 }}>
            <Text style={s.label}>Anmerkungen</Text>
            <Text>{data.notes}</Text>
          </View>
        )}

        <View style={s.footer} fixed>
          <Text>{c.footer}</Text>
          <Text>
            {[
              c.companyName,
              c.phone && `Tel: ${c.phone}`,
              c.email,
              c.taxNumber && `Steuernr.: ${c.taxNumber}`,
              c.vatId && `USt-IdNr.: ${c.vatId}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
