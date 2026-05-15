# Price Management Guide

## Overview
This guide provides a permanent, database-level solution for managing service pricing. All pricing changes are made through SQL scripts and executed via wrangler CLI commands.

## Quick Start

### Update Prices (Local Development)
```powershell
.\update-prices.ps1 local
```

### Update Prices (Production)
```powershell
.\update-prices.ps1 remote
```

## Manual SQL Updates

### Using SQL Script
```bash
# Local
npx wrangler d1 execute scratchsolid_db --local --file=sql/update_service_pricing.sql

# Production
npx wrangler d1 execute scratchsolid_db --remote --file=sql/update_service_pricing.sql
```

### Using Direct SQL Commands
```bash
# Update base price for Standard Clean (individual)
npx wrangler d1 execute scratchsolid_db --local --command="UPDATE service_pricing SET price = 350.00 WHERE service_id = 1 AND client_type = 'individual'"

# Update unit price for Standard Clean
npx wrangler d1 execute scratchsolid_db --local --command="UPDATE service_pricing SET unit_price = 100.00 WHERE service_id = 1"

# Production (add --remote flag)
npx wrangler d1 execute scratchsolid_db --remote --command="UPDATE service_pricing SET price = 350.00 WHERE service_id = 1"
```

## Pricing Structure

### Database Schema
The `service_pricing` table contains:
- `service_id`: Reference to the service (1=Standard Clean, 2=Deep Clean, etc.)
- `client_type`: 'individual' or 'business'
- `price`: Base price (first unit)
- `unit_price`: Price per additional unit (bedroom/m²)
- `min_quantity`: Minimum quantity allowed
- `max_quantity`: Maximum quantity allowed
- `unit`: Unit type (service, m², bedroom)

### Pricing Formula
For residential services (bedrooms):
```
Total Price = base_price + ((quantity - 1) x unit_price)
```

Examples:
- 1 bedroom: R350 + (0 x R100) = R350
- 2 bedrooms: R350 + (1 x R100) = R450
- 3 bedrooms: R350 + (2 x R100) = R550

For commercial services (m²):
```
Total Price = base_price + (quantity x unit_price)
```

### Current Pricing

| Service | Individual Base | Individual Unit | Business Base | Business Unit | Unit Type |
|---------|----------------|-----------------|---------------|---------------|-----------|
| Standard Clean | R350 | R100/bedroom | R450 | R100/bedroom | bedroom |
| Deep Clean | R550 | R150/bedroom | R650 | R150/bedroom | bedroom |
| Move In/Out | R750 | R200/bedroom | R850 | R200/bedroom | bedroom |
| Post-Construction | R1200 | R50/m² | R1400 | R50/m² | m² |
| Commercial | - | - | R450 | R20/m² | m² |

## How to Update Prices

### Step 1: Edit the SQL Script
Open `sql/update_service_pricing.sql` and modify the pricing values:

```sql
UPDATE service_pricing 
SET price = 400.00,     -- Change base price
    unit_price = 120.00 -- Change unit price
WHERE service_id = 1 AND client_type = 'individual';
```

### Step 2: Apply Changes
Run the PowerShell script:
```powershell
.\update-prices.ps1 local
```

### Step 3: Verify Changes
```bash
npx wrangler d1 execute scratchsolid_db --local --command="SELECT * FROM service_pricing ORDER BY service_id, client_type"
```

### Step 4: Test in Development
Test the quote flow at http://localhost:3000/services to verify the new prices are working correctly.

### Step 5: Deploy to Production
Once verified, run:
```powershell
.\update-prices.ps1 remote
```

## Viewing Current Prices

### View All Pricing
```bash
npx wrangler d1 execute scratchsolid_db --local --command="SELECT s.name, sp.client_type, sp.price, sp.unit_price FROM service_pricing sp JOIN services s ON sp.service_id = s.id ORDER BY sp.service_id, sp.client_type"
```

### View Specific Service
```bash
npx wrangler d1 execute scratchsolid_db --local --command="SELECT * FROM service_pricing WHERE service_id = 1"
```

## Rollback Procedure

If you need to revert price changes:

### Option 1: Re-run Previous SQL Script
Keep previous versions of `update_service_pricing.sql` with timestamps:
```bash
npx wrangler d1 execute scratchsolid_db --remote --file=sql/update_service_pricing_backup_2024-05-15.sql
```

### Option 2: Manual Rollback
```bash
npx wrangler d1 execute scratchsolid_db --remote --command="UPDATE service_pricing SET price = 350.00, unit_price = 100.00 WHERE service_id = 1 AND client_type = 'individual'"
```

## Best Practices

1. **Always test locally first** - Apply changes to local database, test thoroughly, then deploy to production
2. **Backup before changes** - Export current pricing before making changes:
   ```bash
   npx wrangler d1 execute scratchsolid_db --local --command="SELECT * FROM service_pricing" > pricing_backup.sql
   ```
3. **Document changes** - Add comments in the SQL script explaining why prices were changed
4. **Use version control** - Keep SQL scripts in git with commit messages explaining price changes
5. **Communicate changes** - Inform team members of pricing updates before deployment

## Troubleshooting

### Script Fails
- Check wrangler is installed: `npx wrangler --version`
- Verify database name: `scratchsolid_db`
- Check SQL syntax in the script

### Prices Not Reflecting
- Clear browser cache
- Restart development server
- Check if you're looking at local vs production database

### Quantity Validation Errors
- Verify `min_quantity` and `max_quantity` values in database
- Check if quantity values match the property type (residential vs commercial)

## Support
For issues with price management, check the database logs or contact the development team.
