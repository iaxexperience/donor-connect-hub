export function medicineDonation(name: string, unit: string, quantity: string) {
 const count=Number(quantity);
 if (!name.trim() || !['unidade','caixa'].includes(unit) || !/^\d+$/.test(quantity) || !Number.isSafeInteger(count) || count<1) throw new Error('Informe o nome do remédio, a apresentação e uma quantidade inteira maior que zero.');
 return {descricao:name.trim(),quantidade:`${count} ${unit}${count===1?'':'s'}`};
}
