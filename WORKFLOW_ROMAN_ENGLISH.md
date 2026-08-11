# 🛒 NearMart - Full Project Workflow & Architecture Guide (Roman English)

Yeh document **NearMart (Hyperlocal Express Marketplace)** app ka poora workflow, architecture, aur features Roman English / Urdu me step-by-step explain karta hai.

---

## 🏗️ 1. Project Architecture & Tech Stack

NearMart ek **Hyperlocal Marketplace Platform** hai jahan aapke neigborhood ke local bakeries, organic growers, aur artisans apne products sell karte hain.

* **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons
* **Full-Stack Proxy Server**: Node.js + Express (`server.ts` port `3000` par run hota hai)
* **Backend**: Django 5 + Django REST Framework (Python, port `8001` par auto-spawn hota hai)
* **Bridge**: Express Server (`server.ts`) saari `/api/v1/*` requests ko automatically Django REST API par proxy karta hai. Agar backend offline ho, to fallback `database.json` use hoti hai.

---

## 👥 2. Roles & User Journeys (Multi-Role System)

NearMart me Top Bar par **3 Core Roles** ka instant switcher hai:
1. **Customer View** (Patron / Buyer)
2. **Shop Owner View** (Merchant / Store Manager)
3. **Admin View** (Platform Administrator)

---

## 🛍️ 3. Complete Customer Workflow (Buyer Journey)

### Step 1: Neighborhood Location & Search
* User header se apna neighborhood select karta hai (e.g. *Greenpoint, Brooklyn* ya *Williamsburg*).
* Top Search Bar se kisi bhi local bakery, product, ya keyword (e.g., *"Sourdough"*) ko search kar sakta hai.
* Category Pills (e.g. *All, Bakery, Produce, Coffee, Artisan Crafts, Pantry*) se direct filter kar sakta hai.

### Step 2: Marketplace Discovery & Shop View
* **Bento Grid Hero Section**: Trending stores, active deals, aur community impact metrics check karta hai.
* **Neighborhood Stores Grid**: Nearby verified shops dekhta hai (Rating, Delivery Time, Distance).
* **Shop Page**: Shop card par click karke shop ki details, banner, address, aur specific fresh items explore kar sakta hai.

### Step 3: Wishlist & Basket Management
* Product card ke Heart Icon `❤️` par click karke item Wishlist me save hoti hai.
* **Add to Basket**: Product ko basket me add karta hai. 
* **Hyperlocal Single-Shop Validation**: Order integrity ke liye basket ek waqt me ek hi shop ke items allow karti hai.

### Step 4: Coupon Application
* Checkout drawer me Promo Code (e.g. `NEIGHBOR10`) daal kar discount percentage (10% OFF) apply kar sakta hai.

### Step 5: Checkout & Payment Methods
* Delivery Address select karta hai.
* Payment Option choose karta hai:
  * **Stripe Credit/Debit Card**
  * **JazzCash Mobile Wallet**
  * **Easypaisa Mobile Wallet**
  * **Cash on Delivery (COD)**
* Place Order par click karte hi order submit hota hai aur inventory automatically deduct hoti hai.

### Step 6: Live Order Tracking Timeline
* Order submit hone ke baad **Live Tracker** open hota hai:
  1. `Order Placed` (Store ko order mil gaya)
  2. `Preparing` (Items ready ho rahe hain)
  3. `Dispatched` (Courier rashte me hai)
  4. `Delivered` (Safely deliver ho gaya)
* Mobile Wallet select kiya ho to Payment Verification simulation screen chalti hai.

### Step 7: Profile & Profile Picture Adjuster
* **Profile & Address Tab**: User Name, Email, Phone, aur Delivery Address edit kar sakta hai.
* **Photo Upload & Interactive Adjuster**:
  * Camera icon par click karke photo upload karein.
  * **Crop & Adjust Modal** open hota hai:
    * **Drag**: Picture ko circle ring ke andar mouse se reposition/pan kar sakte hain.
    * **Zoom Slider**: 0.8x se 3.0x tak zoom in / zoom out.
    * **Rotate**: 90° steps me photo rotate kar sakte hain.
  * **Save & Apply Picture** dabate hi profile photo AND top-right corner header avatar instantly update ho jati hai!

---

## 🏪 4. Complete Shop Owner Workflow (Merchant Journey)

### Step 1: Merchant Analytics Dashboard
* Merchant ko apne store ka real-time revenue, total orders, active inventory items, aur customer rating show hoti hai.

### Step 2: Add New Product & Manage Inventory
* **Add Product**: Product Name, Price, Description, Category, Image URL, aur Stock Quantity daal kar naya item list kar sakta hai.
* **Stock Updater**: Directly stock count (e.g., 50 -> 45) increment/decrement kar sakta hai.

### Step 3: Order Fulfillment & Status Updates
* Customer ke incoming orders `Merchant Order Queue` me aate hain.
* Merchant status advance kar sakta hai: `Pending` ➔ `Preparing` ➔ `Dispatched` ➔ `Delivered`.
* Status update hote hi Customer ke Live Tracker me realtime update ho jata hai.

### Step 4: Refunds & Cancellations
* Agar customer order cancel kare to Merchant 1-click se payment refund issue kar sakta hai, jisse product stock automatically restore ho jata hai.

### Step 5: Shop Profile Customization
* Store Name, Category, Description, Logo URL, aur Banner image edit karke Save kar sakta hai.

---

## 🛡️ 5. Complete Admin Workflow (Platform Administrator)

### Step 1: Platform Overview & Metrics
* Admin pure NearMart ecosystem ke metrics dekhta hai (Total Merchants, System Revenue, Total Registered Users, Active Coupons).

### Step 2: Merchant Approval Queue
* Naye sign up hone wale Store Owners `Pending Approval` list me aate hain.
* Admin **Approve & Verify** button daba kar 1-click me unhein NearMart Marketplace par live kar sakta hai.

### Step 3: Coupon & Promotions Manager
* Naye discount codes issue kar sakta hai (Code, Discount %, Minimum Spend, Expiry Date).

### Step 4: User & Security Management
* Platform ke tamaam customers aur merchants ki list dekhta hai.
* Suspicious accounts ko **Block / Unblock** kar sakta hai.

### Step 5: Reset Demo App
* Footer me `Reset Demo App` button se poore database aur sample state ko 1-click me reset kar sakta hai.

---

## ⚡ 6. How to Run NearMart App

1. Terminal me project path par jayein:
   ```bash
   d:\nearmart
   ```
2. Development server start karein:
   ```bash
   cmd /c npm run dev
   ```
3. Browser me yeh URL open karein:
   ```text
   http://localhost:3000
   ```

---
*NearMart Hyperlocal Architecture Documentation - Generated Successfully.*
