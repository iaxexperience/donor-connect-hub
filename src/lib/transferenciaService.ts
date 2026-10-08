import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
export interface DoacaoTransferida { id:string; donor_name:string; tipo_doacao:string; subtipo?:string; quantidade?:string; descricao?:string; status:string; created_at:string }
export interface TransferenciaData { numero:string; data:string; origem:string; setor_destino:string; coordenador:string; coordenador_email?:string; coordenador_telefone?:string; ramal?:string; doacoes:DoacaoTransferida[]; obs?:string; org:{system_name?:string;logo_url?:string;cnpj?:string;address?:string;phone?:string;email?:string} }
export function buildTransferPDF(data:TransferenciaData, preview=false) {
 const doc=new jsPDF({unit:'mm',format:'a4'});
 doc.setFontSize(17); doc.text(preview?'PRÉVIA - SEM CONFIRMAÇÃO':'TERMO DE ENTREGA AO SETOR',14,20);
 doc.setFontSize(10); doc.text(doc.splitTextToSize(`${data.org.system_name||'Organização'} | CNPJ: ${data.org.cnpj||'Não informado'}\nNº ${data.numero} | ${data.data}`,180),14,29);
 autoTable(doc,{startY:44,theme:'grid',body:[['Origem',data.origem],['Destino',data.setor_destino],['Responsável pelo recebimento',data.coordenador],['Contato',[data.coordenador_email,data.coordenador_telefone,data.ramal && `Ramal ${data.ramal}`].filter(Boolean).join(' | ')]],styles:{fontSize:10,cellPadding:3},columnStyles:{0:{cellWidth:55}},headStyles:{fillColor:[14,60,120]}});
 let y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8;
 autoTable(doc,{startY:y,head:[['Doador','Produto / Descrição','Quantidade','Status']],body:data.doacoes.map(d=>[d.donor_name,[d.tipo_doacao,d.subtipo,d.descricao].filter(Boolean).join(' - '),d.quantidade||'Não informada',d.status]),styles:{fontSize:9,cellPadding:3,overflow:'linebreak'},headStyles:{fillColor:[14,60,120]},margin:{bottom:20}});
 y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8;
 if(data.obs){autoTable(doc,{startY:y,body:[['Observações',data.obs]],theme:'plain',styles:{fontSize:9}});y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+8;}
 if(y>230){doc.addPage();y=25;}
 doc.setFontSize(10);doc.text('Conferência dos produtos e assinatura na entrega:',14,y);
 doc.line(14,y+22,95,y+22); doc.line(112,y+22,195,y+22);
 doc.text('Responsável pela transferência',14,y+28);
 doc.text(doc.splitTextToSize(`${data.coordenador}\n${data.setor_destino}`,82),112,y+28);
 doc.text('Data de recebimento: ____/____/________',14,y+46);
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setFontSize(8);doc.text(`Termo ${data.numero} | Página ${page} de ${doc.getNumberOfPages()}`,14,289);}
 return doc;
}
export async function gerarPDFTransferencia(data:TransferenciaData, options:{printWindow?:Window|null;print?:boolean;preview?:boolean}={}) {
 const doc=buildTransferPDF(data,options.preview);
 if(options.print) doc.autoPrint();
 if(options.printWindow && !options.printWindow.closed){
 const url=URL.createObjectURL(doc.output('blob'));
 options.printWindow.location.replace(url);
 // Keep the object URL alive while the PDF viewer loads/prints.
 window.setTimeout(()=>URL.revokeObjectURL(url),300000);
 } else doc.save(`transferencia_doacoes_${data.numero.replace(/[^a-zA-Z0-9-]/g,'-')}.pdf`);
}
