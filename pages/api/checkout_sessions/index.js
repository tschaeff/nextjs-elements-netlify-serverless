import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
import { validateCartItems } from 'use-shopping-cart/src/serverUtil';

/*
 * Product data can be loaded from anywhere. In this case, we’re loading it from
 * a local JSON file, but this could also come from an async call to your
 * inventory management service, a database query, or some other API call.
 *
 * The important thing is that the product info is loaded from somewhere trusted
 * so you know the pricing information is accurate.
 */
import inventory from '../../../data/products.json';

export default async (req, res) => {
  try {
    const cartItems = req.body;

    const line_items = validateCartItems(inventory, cartItems);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA'],
      },
      success_url: `${req.headers.origin}/success`,
      cancel_url: `${req.headers.origin}`,
      line_items: [
        ...line_items,
        {
          name: 'Shipping fee',
          description: 'Handling and shipping fee for global delivery',
          quantity: 1,
          amount: 350,
          currency: 'USD',
        },
      ],
      // We are using the metadata to track which items were purchased.
      // We can access this meatadata in our webhook handler to then handle
      // the fulfillment process.
      // In a real application you would track this in an order object in your database.
      payment_intent_data: {
        metadata: {
          items: JSON.stringify(
            Object.keys(cartItems).map((sku) => ({
              sku,
              quantity: cartItems[sku].quantity,
            }))
          ),
        },
      },
    });
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.log({ error });

    res.status(400).json(error);
  }
};
