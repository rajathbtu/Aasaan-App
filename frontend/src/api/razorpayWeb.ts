import { Alert } from 'react-native';

export interface RazorpayWebPaymentOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description?: string;
  image?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
}

export interface RazorpayWebResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export class RazorpayWeb {
  static generatePaymentHTML(options: RazorpayWebPaymentOptions): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Razorpay Payment</title>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
        }
        .amount {
            font-size: 32px;
            font-weight: bold;
            color: #333;
            margin: 20px 0;
        }
        .description {
            color: #666;
            margin-bottom: 30px;
        }
        .pay-button {
            background: ${options.theme?.color || '#528FF0'};
            color: white;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-bottom: 20px;
        }
        .pay-button:hover {
            opacity: 0.9;
        }
        .cancel-button {
            background: #f0f0f0;
            color: #333;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-size: 14px;
            cursor: pointer;
            width: 100%;
        }
        .loading {
            display: none;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>${options.name}</h2>
        <div class="amount">₹${(options.amount / 100).toFixed(2)}</div>
        <div class="description">${options.description || 'Complete your payment'}</div>
        
        <button id="payButton" class="pay-button" onclick="startPayment()">
            Pay Now
        </button>
        
        <button id="cancelButton" class="cancel-button" onclick="cancelPayment()">
            Cancel
        </button>
        
        <div id="loading" class="loading">Processing payment...</div>
    </div>

    <script>
        function startPayment() {
            document.getElementById('payButton').style.display = 'none';
            document.getElementById('cancelButton').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            
            const options = {
                key: "${options.key}",
                amount: ${options.amount},
                currency: "${options.currency}",
                order_id: "${options.order_id}",
                name: "${options.name}",
                description: "${options.description || ''}",
                image: "${options.image || ''}",
                prefill: {
                    name: "${options.prefill?.name || ''}",
                    email: "${options.prefill?.email || ''}",
                    contact: "${options.prefill?.contact || ''}"
                },
                theme: {
                    color: "${options.theme?.color || '#528FF0'}"
                },
                handler: function(response) {
                    // Payment successful
                    const result = {
                        type: 'success',
                        data: {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_signature: response.razorpay_signature
                        }
                    };
                    window.ReactNativeWebView?.postMessage(JSON.stringify(result));
                },
                modal: {
                    ondismiss: function() {
                        // Payment cancelled
                        const result = {
                            type: 'cancel',
                            message: 'Payment cancelled by user'
                        };
                        window.ReactNativeWebView?.postMessage(JSON.stringify(result));
                    }
                }
            };
            
            try {
                const rzp = new Razorpay(options);
                rzp.on('payment.failed', function(response) {
                    const result = {
                        type: 'error',
                        data: response.error
                    };
                    window.ReactNativeWebView?.postMessage(JSON.stringify(result));
                });
                rzp.open();
            } catch (error) {
                const result = {
                    type: 'error',
                    message: 'Failed to initialize payment'
                };
                window.ReactNativeWebView?.postMessage(JSON.stringify(result));
            }
        }
        
        function cancelPayment() {
            const result = {
                type: 'cancel',
                message: 'Payment cancelled by user'
            };
            window.ReactNativeWebView?.postMessage(JSON.stringify(result));
        }
        
        // Auto-start payment when page loads
        window.onload = function() {
            // Give a small delay for the WebView to be ready
            setTimeout(startPayment, 500);
        };
    </script>
</body>
</html>
    `;
  }
}

export const razorpayWeb = {
  open: (options: RazorpayWebPaymentOptions): Promise<RazorpayWebResponse> => {
    return new Promise((resolve, reject) => {
      // This will be handled by the WebView component
      reject(new Error('Use RazorpayWebView component instead'));
    });
  }
};
