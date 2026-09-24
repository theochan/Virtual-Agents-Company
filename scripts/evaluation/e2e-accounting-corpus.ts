// Fresh synthetic integration fixture; author-visible oracle, never independent holdout evidence.
export const documentCases=[{
 id:'mixed-unit-two-supplier',
 inputs:{
  'register.csv':'id,entity,currency,unit,type,amount\nM41,Maple,GBP,major,invoice,214.75\nJ52,Juniper,EUR,major,invoice,89.60\n',
  'supplement.txt':'ID: M41\nEntity: Maple\nCurrency: GBP\nUnit: minor\nType: invoice\nAmount: 21475\n\nID: J53\nEntity: Juniper\nCurrency: EUR\nUnit: minor\nType: credit\nAmount: -140\n',
 },
 totals:[['Juniper','EUR',9100],['Maple','GBP',21475]],
 rows:4,duplicates:1,
 order:['single','planned','autonomous'],
}];
