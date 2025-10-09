const { subscribeToQueue } = require("../broker/broker")
const { sendEmail } = require("../email")

module.exports = function () {
  subscribeToQueue("AUTH_NOTIFICATION.USER_CREATED", async (data) => {
    // console.log("Received Data: ", data);
    const emailHtmlTemplate = `
      <h1>Welcome to Market Ai place.!</h1>
      <p>Hi ${data.fullName.firstName + " " + (data.fullName.lastName || "")},</p>
      <p>Thank you for registering with us. We're excited to have you on board!</p>
      <p>Best Regards,<br/>The Market Ai Place Team</p>
    `;

    await sendEmail(data.email, "Welcome to Market Ai place", "", emailHtmlTemplate);
  });

  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {
    const emailHtmlTemplate = `
      <h1>Payment Successful!</h1>
      <p>Hi ${data.username},</p>
      <p>Your payment with Order ID : ${data.orderId} 
      of ${data.currency} ${data.amount} 
      has been successfully processed. 
      Thank you for your purchase!</p>
      <p>Best Regards,<br/>The Market Ai Place Team</p>
    `;

    await sendEmail(data.email, "Payment Successful", "", emailHtmlTemplate);
  })

  subscribeToQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data) => {
    const emailHtmlTemplate = `
      <h1>Payment Failed!</h1>
      <p>Your payment with Order ID : ${data.orderId} and with Payment ID : ${data.paymentId} is failed. 
      Try again Later or Contact Us!</p>
      <p>The Market Ai Place Team</p>
    `;

    await sendEmail(data.email, "Payment Failed", "", emailHtmlTemplate);
  })
};
