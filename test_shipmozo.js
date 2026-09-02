const publicKey = 'ZZQA8iBe7kYpUnmRVTru';
const privateKey = 'QHSIPL90pNVnmK2XBM4v';

async function testApi(typeOfPackage) {
  const payload = {
    pickup_pincode: 124001,
    delivery_pincode: 600004,
    payment_type: 'COD',
    shipment_type: 'FORWARD',
    order_amount: 20000,
    type_of_package: typeOfPackage,
    rov_type: 'ROV_OWNER',
    cod_amount: '15000',
    weight: 22000,
    dimensions: [
      { no_of_box: '1', length: '100', width: '40', height: '11' },
      { no_of_box: '1', length: '100', width: '40', height: '11' }
    ]
  };

  const response = await fetch('https://shipping-api.com/app/api/v1/rate-calculator', {
    method: 'POST',
    headers: {
      'public-key': publicKey,
      'private-key': privateKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const json = await response.json();
  console.log('--- Testing type_of_package: ' + typeOfPackage + ' ---');
  if (json.data && Array.isArray(json.data)) {
    console.log('Results: ' + json.data.length);
    json.data.forEach(r => console.log(' - ' + r.name));
  } else {
    console.log(json);
  }
}

async function run() {
  await testApi('SPS');
  await testApi('MPS');
  await testApi('B2B');
  await testApi('HEAVY');
  await testApi('ESSENTIALS');
}

run();
