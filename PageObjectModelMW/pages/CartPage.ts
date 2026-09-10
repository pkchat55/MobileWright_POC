import type { Screen } from '@mobilewright/core';

export class CartPage {

    constructor(
        private readonly screen: Screen,
    ) { }


    //----Locators------

    private get removeButtons() {

        return this.screen.getByLabel('Remove');
    }

    //----Actions----

    async itemCount() {
        return await this.removeButtons.count();
    }

    async emptyCart() {
        const maxAttempts = 25;
        for (let attempt = 0; attempt < maxAttempts && await this.itemCount() > 0; attempt++) {
            await this.removeButtons.first().tap();
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }



}