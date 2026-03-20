const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ✅ Charge using Token
const charge = async (req, res, next) => {
  try {
    const { token, amount, currency } = req.body;

    if (!token || !amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'token, amount and currency are required'
      });
    }

    const chargeResult = await stripe.charges.create({
      amount: amount,
      currency: currency,
      source: token,
      description: 'Pet Odyssey Payment',
    });

    res.status(200).json({
      success: true,
      chargeId: chargeResult.id,
      message: 'Payment successful'
    });

  } catch (error) {
    next(error);
  }
};

// ✅ Create Payment Intent
const createIntent = async (req, res, next) => {
  try {
    const { amount, currency } = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        message: 'amount and currency are required'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: currency,
      payment_method_types: ['card'],
    });

    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { charge, createIntent };