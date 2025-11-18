import { createClient } from '@supabase/supabase-js'
import express, { json, urlencoded } from 'express';
import dotenv from 'dotenv';
import customerSchema from './purchaseSchema.js';
dotenv.config();
const supabaseUrl = 'https://yuggzirvwjezbxxsyrgi.supabase.co'
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const app = express();
app.use(express.static('public'));
app.use(json());
app.use(urlencoded({ extended: true }));

// your normal routes above...

// catch-all for nonexistent routes
/*
app.get('/',(req,res) => {
  console.log('All good');
  res.status(200).send('hola');
})
*/
app.get('/gift/:customer_id', async (req,res) => {
   const { customer_id } = req.params;
   const { data: customer, error } = await supabase.from('customers')
                                          .select(`id, cedula, nombre,cantidad,customer_promo, \
                                            promos (promo_id, descripcion, monto)`).eq('cedula',customer_id);
 // console.log(JSON.stringify(customer, null, 2));
   if(error){
    console.log('Error Supabase', error);
    return res.status(500).json({'error': error});
  }

  if (!customer || customer.length === 0) {
    console.log('Customer not found:', customer_id);
    return res.status(404).send('Cliente no  encontrado');
  }

  const { cedula, nombre, cantidad: saldo, promos} = customer[0];
  const { monto, descripcion } = promos;

  if( monto >= saldo ){
    return res.status(400).send('Falta poco, solo ' + (monto - saldo) + ' para tu recompensa!' );
  }else{
    const { data, error } = await supabase.from('customers').update({ cantidad: saldo - monto }).eq('cedula', customer_id);
    if(error){
      console.log('Error updating customer:', error);
      return res.status(500).json({'error': error});
    }
  }

res.send(
  `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Customer Invoice</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      background-color: #f9f9f9;
      color: #333;
    }
    .header {
      display: flex;
      align-items: center;
      margin-bottom: 40px;
    }
    .logo {
      height: 80px;
      margin-right: 20px;
    }
    .title {
      font-size: 2em;
      font-weight: bold;
    }
    .card {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      max-width: 500px;
    }
    .field {
      margin-bottom: 20px;
    }
    .label {
      font-weight: bold;
      color: #555;
    }
    .value {
      font-size: 1.2em;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="/images/logo.jpeg" alt="Business Logo" class="logo" />
    <div class="title">Gift Card</div>
  </div>
   <div class="field">
      <div class="label">Cedula o Rif</div>
      <div class="value">${cedula}</div>
   </div>
  <div class="card">
    <div class="field">
      <div class="label">Cliente</div>
      <div class="value">Felicidades ${nombre} !</div>
    </div>
    <div class="field">
      <div class="label">Cantidad</div>
      <div class="value">Has consumido ${monto} Dolares. Recompensa: ${descripcion}!</div>
    </div>
  </div>
</body>
</html>
  `);

});

app.get('/promos',async (req,res) => {
   const { data: promos, error } = await supabase.from('promos').select('*');
    if(error){
      console.log('Error Supabase', error);
      return res.status(500).json({'error': error});
    }
    res.status(200).json(promos); 
});

app.get('/customer/:customer_id', async (req,res) => {
   const { customer_id } = req.params;
   const { data: customer, error } = await supabase.from('customers').select('*, promos (promo_id, descripcion)').eq('cedula', customer_id);
    if(error){
      console.log('Error Supabase', error);
      return res.status(500).json({'error': error});
    } 
    if (!customer || customer.length === 0) {
      console.log('Customer not found:', customer_id);
      return res.status(404).json({ error: 'Customer not found' });
    } 
    console.log(customer[0]);
    res.status(200).json(customer[0]);
});

app.post('/consumo', async (req,res) => {
 
  // Validate request body  
   console.log(req.body);
   const result = customerSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error;
      console.log('Validation errors:', errors);
      return res.status(400).json({ errors });
    }
   // console.log(req.body)
    const { cedula, nombre, cantidad, customer_promo, telefono } = req.body;

    var dt; 

    const { data, error } = await supabase.from('customers').select('*, promos ( descripcion )').eq('cedula', cedula);
    if(error){
      console.log('Error Supabase', error);
      return res.status(500).json({'error': error});
    }
    if(!data || 0 >= data.length ){

      // Insert new customer
      const { data: insertData, error: insertError } = await supabase.from('customers')
      .insert({ cedula, nombre, cantidad, customer_promo, telefono });
      if(insertError){
        console.log('Error inserting customer:', insertError);
        return res.status(500).json({'error': insertError});
      }
      return  res.status(201).json(insertData);
    }else{
      // Update existing customer
      const { data: updateData, error: updateError } = await supabase.from('customers')
      .update({ cantidad: data[0].cantidad + cantidad , customer_promo: customer_promo, telefono: telefono, nombre: nombre}).eq('cedula', cedula);  
      if(updateError){
        console.log('Error updating customer:', updateError);
        return res.status(500).json({'error': updateError});
      }
      return res.status(200).json(updateData);
    }
    });

app.use((req, res, next) => {
  res.status(404).send(`
    <html>
      <head><title>Not Found</title></head>
      <body>
        <h1>404 - Page Not Found</h1>
        <p>The route "${req.originalUrl}" does not exist.</p>
      </body>
    </html>
  `)
});




app.listen(3000, () => {
   console.log('App listening on port 3000');
});