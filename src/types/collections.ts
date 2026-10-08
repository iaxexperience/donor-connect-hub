export interface CollectionSnapshot { donor_name: string; document: string; phone: string; address: string; neighborhood: string; zip_code: string; description: string; quantity: string; amount: number | null }
export interface Candidate { source_kind: 'physical' | 'cash'; source_id: string; snapshot: CollectionSnapshot }
export interface Receipt { id: string; number: string; status: 'issued' | 'confirmed' | 'cancelled' | 'disputed'; issued_at: string; organization: Record<string,string>; courier: {name:string;document:string}; verification_url: string }
export interface CollectionItem extends Candidate { id:string; position:number; receipts: Receipt[] }
export interface CollectionRoute { id:string; collection_date:string; shift:string; dispatched_at:string; route_items:CollectionItem[] }
