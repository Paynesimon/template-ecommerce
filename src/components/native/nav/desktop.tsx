'use client'

import {
   NavigationMenu,
   NavigationMenuContent,
   NavigationMenuItem,
   NavigationMenuLink,
   NavigationMenuList,
   NavigationMenuTrigger,
   navigationMenuTriggerStyle,
} from '@/components/ui/navigation-menu'
import { cn } from '@/lib/utils'
import { config } from '@/lib/config'
import Link from 'next/link'
import { forwardRef, useEffect, useState } from 'react'

export function MainNav() {
   return (
      <div className="hidden md:flex gap-4">
         <Link href="/" className="flex items-center">
            <span className="hidden font-medium sm:inline-block">
               {config.store.name}
            </span>
         </Link>
         <NavMenu />
      </div>
   )
}

export function NavMenu() {
   const [categories, setCategories] = useState([])
   const [brands, setBrands] = useState([])

   useEffect(() => {
      fetch('/api/categories').then(r => r.json()).then(setCategories).catch(() => [])
      fetch('/api/brands').then(r => r.json()).then(setBrands).catch(() => [])
   }, [])

   return (
      <NavigationMenu>
         <NavigationMenuList>
            <NavigationMenuItem>
               <Link href="/products" legacyBehavior passHref>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                     <div className="font-normal text-foreground/70">
                        Products
                     </div>
                  </NavigationMenuLink>
               </Link>
            </NavigationMenuItem>

            <NavigationMenuItem>
               <NavigationMenuTrigger>
                  <div className="font-normal text-foreground/70">
                     Categories
                  </div>
               </NavigationMenuTrigger>
               <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 md:w-[400px] lg:w-[500px] lg:grid-cols-2">
                     {categories.length > 0 ? (
                        categories.map((category: any) => (
                           <ListItem
                              key={category.id}
                              href={`/products?category=${category.title}`}
                              title={category.title}
                           >
                              {category.description || `Browse ${category.title} products`}
                           </ListItem>
                        ))
                     ) : (
                        <li className="p-4 text-sm text-muted-foreground">
                           No categories yet
                        </li>
                     )}
                  </ul>
               </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
               <NavigationMenuTrigger>
                  <div className="font-normal text-foreground/70">Brands</div>
               </NavigationMenuTrigger>
               <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-2 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                     {brands.length > 0 ? (
                        brands.map((brand: any) => (
                           <ListItem
                              key={brand.id}
                              href={`/products?brand=${brand.title}`}
                              title={brand.title}
                           >
                              {brand.description || `Browse ${brand.title} products`}
                           </ListItem>
                        ))
                     ) : (
                        <li className="p-4 text-sm text-muted-foreground">
                           No brands yet
                        </li>
                     )}
                  </ul>
               </NavigationMenuContent>
            </NavigationMenuItem>
         </NavigationMenuList>
      </NavigationMenu>
   )
}

const ListItem = forwardRef<
   React.ElementRef<'a'>,
   React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, href, ...props }, ref) => {
   return (
      <li>
         <NavigationMenuLink asChild>
            <Link
               href={href}
               ref={ref}
               className={cn(
                  'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  className
               )}
               {...props}
            >
               <div className="text-sm font-medium leading-none">{title}</div>
               <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                  {children}
               </p>
            </Link>
         </NavigationMenuLink>
      </li>
   )
})

ListItem.displayName = 'ListItem'
