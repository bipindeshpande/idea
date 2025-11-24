"""
Email templates for triggered emails.
"""
from datetime import datetime
from typing import Optional


def get_base_template(content: str, unsubscribe_url: Optional[str] = None) -> str:
    """Base email template with header and footer."""
    footer = ""
    if unsubscribe_url:
        footer = f'<p style="font-size: 12px; color: #666; margin-top: 30px;"><a href="{unsubscribe_url}" style="color: #666;">Unsubscribe</a></p>'
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Idea Bunch</h1>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
            {content}
            {footer}
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #999;">
            <p>© {datetime.now().year} Idea Bunch. All rights reserved.</p>
        </div>
    </body>
    </html>
    """


def validation_ready_email(user_name: str, validation_id: str, validation_score: Optional[float] = None) -> tuple[str, str]:
    """Email template for when validation is ready."""
    score_text = ""
    if validation_score is not None:
        score_text = f'<p style="font-size: 18px; font-weight: bold; color: #667eea;">Overall Score: {validation_score:.1f}/10</p>'
    
    name = user_name.split("@")[0] if "@" in user_name else user_name
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>Great news! Your idea validation is complete and ready to review.</p>
    {score_text}
    <p>You can now view your detailed validation results, including:</p>
    <ul>
        <li>Detailed analysis across 10 key parameters</li>
        <li>Actionable recommendations for improvement</li>
        <li>Final conclusion with decision rationale</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com/validate-result?id={validation_id}" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            View Validation Results
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">Tip: After reviewing your validation, you can click "Discover Related Ideas" to explore similar startup opportunities.</p>
    """
    
    text_content = f"""
Hi {name},

Your idea validation is complete and ready to review.

View your results at: https://ideabunch.com/validate-result?id={validation_id}

You'll see detailed analysis, recommendations, and a final conclusion to help guide your next steps.
"""
    
    return get_base_template(content), text_content


def trial_ending_email(user_name: str, days_remaining: int) -> tuple[str, str]:
    """Email template for trial ending soon."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    days_text = "1 day" if days_remaining == 1 else f"{days_remaining} days"
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>Your 3-day free trial ends in <strong>{days_text}</strong>.</p>
    <p>Don't miss out on:</p>
    <ul>
        <li>Unlimited idea validations</li>
        <li>Personalized startup recommendations</li>
        <li>Detailed analysis and roadmaps</li>
        <li>Access to all platform features</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com/pricing" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Subscribe Now - Starting at $5/week
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">Choose the plan that works for you: $5/week or $15/month.</p>
    """
    
    text_content = f"""
Hi {name},

Your 3-day free trial ends in {days_text}.

Subscribe now to continue accessing all features:
https://ideabunch.com/pricing

Choose between $5/week or $15/month.
"""
    
    return get_base_template(content), text_content


def subscription_expiring_email(user_name: str, subscription_type: str, days_remaining: int) -> tuple[str, str]:
    """Email template for subscription expiring soon."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    days_text = "1 day" if days_remaining == 1 else f"{days_remaining} days"
    plan_name = "Weekly" if subscription_type == "weekly" else "Monthly"
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>Your {plan_name} subscription expires in <strong>{days_text}</strong>.</p>
    <p>Renew now to continue accessing:</p>
    <ul>
        <li>Unlimited idea validations</li>
        <li>Personalized startup recommendations</li>
        <li>All platform features</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com/pricing" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Renew Subscription
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">Your subscription will automatically renew if you don't take action.</p>
    """
    
    text_content = f"""
Hi {name},

Your {plan_name} subscription expires in {days_text}.

Renew now: https://ideabunch.com/pricing
"""
    
    return get_base_template(content), text_content


def welcome_email(user_name: str) -> tuple[str, str]:
    """Email template for new user welcome."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Welcome, {name}!</h2>
    <p>Thanks for joining Idea Bunch. You're now ready to validate and discover your next startup idea.</p>
    <p><strong>Here's what you can do:</strong></p>
    <ol>
        <li><strong>Validate an existing idea</strong> - Get detailed feedback on your startup concept</li>
        <li><strong>Discover new ideas</strong> - Get personalized recommendations based on your profile</li>
        <li><strong>Review your results</strong> - Access detailed analysis and roadmaps</li>
    </ol>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Get Started
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">You have 3 days of free access to explore all features. Enjoy!</p>
    """
    
    text_content = f"""
Welcome, {name}!

Thanks for joining Idea Bunch. You're now ready to validate and discover your next startup idea.

Get started: https://ideabunch.com

You have 3 days of free access to explore all features.
"""
    
    return get_base_template(content), text_content


def subscription_activated_email(user_name: str, subscription_type: str) -> tuple[str, str]:
    """Email template for subscription activation."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    plan_name = "Weekly Plan" if subscription_type == "weekly" else "Monthly Plan"
    price = "$5/week" if subscription_type == "weekly" else "$15/month"
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>🎉 Your subscription to the <strong>{plan_name}</strong> has been activated!</p>
    <p>You now have unlimited access to:</p>
    <ul>
        <li>Unlimited idea validations</li>
        <li>Personalized startup recommendations</li>
        <li>Detailed analysis and execution roadmaps</li>
        <li>All premium features</li>
    </ul>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Start Validating Ideas
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">Your {plan_name} ({price}) is now active. Thank you for your support!</p>
    """
    
    text_content = f"""
Hi {name},

Your subscription to the {plan_name} has been activated!

You now have unlimited access to all features.

Get started: https://ideabunch.com

Thank you for your support!
"""
    
    return get_base_template(content), text_content


def admin_password_reset_email(admin_email: str, reset_link: str) -> tuple[str, str]:
    """Email template for admin password reset."""
    name = admin_email.split("@")[0] if "@" in admin_email else "Admin"
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>You requested to reset your admin password for Startup Idea Advisor.</p>
    <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Admin Password
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email. Your password will remain unchanged.</p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">Or copy and paste this link into your browser:<br>{reset_link}</p>
    """
    
    text_content = f"""
Hi {name},

You requested to reset your admin password for Startup Idea Advisor.

Click this link to reset your password (expires in 1 hour):
{reset_link}

If you didn't request this, please ignore this email.
"""
    
    return get_base_template(content), text_content


def password_reset_email(user_name: str, reset_link: str) -> tuple[str, str]:
    """Email template for password reset."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>We received a request to reset your password for your Startup Idea Advisor account.</p>
    <p>Click the button below to reset your password:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="{reset_link}" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Reset Password
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">This link will expire in 1 hour for security reasons.</p>
    <p style="color: #666; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    <p style="color: #999; font-size: 12px; margin-top: 20px;">Or copy and paste this link into your browser:<br>{reset_link}</p>
    """
    
    text_content = f"""
Hi {name},

We received a request to reset your password for your Startup Idea Advisor account.

Reset your password: {reset_link}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
"""
    
    return get_base_template(content), text_content


def password_changed_email(user_name: str) -> tuple[str, str]:
    """Email template for password change confirmation."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>Your password has been successfully changed.</p>
    <p>If you made this change, you can safely ignore this email.</p>
    <p style="color: #d32f2f; font-weight: bold;">If you did NOT make this change, please contact us immediately to secure your account.</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Go to Dashboard
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">For security, we recommend using a strong, unique password.</p>
    """
    
    text_content = f"""
Hi {name},

Your password has been successfully changed.

If you made this change, you can safely ignore this email.

If you did NOT make this change, please contact us immediately to secure your account.

Go to dashboard: https://startupideaadvisor.com
"""
    
    return get_base_template(content), text_content


def payment_failed_email(user_name: str, subscription_type: str, error_message: str = None) -> tuple[str, str]:
    """Email template for payment failure notification."""
    name = user_name.split("@")[0] if "@" in user_name else user_name
    plan_name = "Weekly Plan" if subscription_type == "weekly" else "Monthly Plan"
    price = "$5/week" if subscription_type == "weekly" else "$15/month"
    
    error_text = ""
    if error_message:
        error_text = f'<p style="color: #d32f2f; font-size: 14px;"><strong>Error:</strong> {error_message}</p>'
    
    content = f"""
    <h2 style="color: #333; margin-top: 0;">Hi {name},</h2>
    <p>We were unable to process your payment for the <strong>{plan_name}</strong> ({price}).</p>
    {error_text}
    <p>To continue using Startup Idea Advisor, please update your payment method:</p>
    <div style="text-align: center; margin: 30px 0;">
        <a href="https://ideabunch.com/pricing" 
           style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Update Payment Method
        </a>
    </div>
    <p style="color: #666; font-size: 14px;">Common reasons for payment failure:</p>
    <ul style="color: #666; font-size: 14px;">
        <li>Insufficient funds</li>
        <li>Expired card</li>
        <li>Card declined by bank</li>
        <li>Incorrect card details</li>
    </ul>
    <p style="color: #666; font-size: 14px;">If you continue to experience issues, please contact support.</p>
    """
    
    text_content = f"""
Hi {name},

We were unable to process your payment for the {plan_name} ({price}).

To continue using Idea Bunch, please update your payment method:
https://ideabunch.com/pricing

Common reasons for payment failure:
- Insufficient funds
- Expired card
- Card declined by bank
- Incorrect card details

If you continue to experience issues, please contact support.
"""
    
    return get_base_template(content), text_content
