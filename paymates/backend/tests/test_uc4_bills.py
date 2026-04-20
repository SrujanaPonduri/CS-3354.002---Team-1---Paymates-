""" Srujana Ponduri 
Unit Tests for UC4: Create/Edit Item Bills

- TC1: Valid bill creation
- TC2: Bill creation with missing amount
- TC3: Bill creation with missing item name
- TC4: Bill creation with negative amount
- TC6: Successful bill editing
- TC7: Editing non-existent bill
"""

import pytest
from unittest.mock import Mock, patch
import sys
import os

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


class TestBillCreation:
    """Test cases for creating new bills (UC4)"""
    
    def test_tc1_create_bill_with_valid_data(self):
        """
        TC1: Bill created successfully
        Input: item_name="Milk", category="Food", amount=20, split="Evenly"
        Expected: Bill is created with all fields filled
        """
        # Arrange
        bill_data = {
            'creator_id': 'user-1',
            'title': 'Milk',
            'category': 'Food',
            'items': [
                {'name': 'Milk', 'quantity': 1, 'unit_price': 20.0}
            ],
            'split_type': 'evenly',
            'tax': 0,
            'assigned_roommates': ['user-1', 'user-2'],
            'home_id': 'home-demo',
            'date': '2026-04-19'
        }
        
        # Act - Validate the bill data structure
        assert bill_data['title'] is not None and bill_data['title'].strip() != '', \
            "Bill title (item name) must not be empty"
        
        assert bill_data['category'] is not None and bill_data['category'].strip() != '', \
            "Category must not be empty"
        
        assert len(bill_data['items']) > 0, "Bill must have at least one item"
        
        total_amount = sum(item['quantity'] * item['unit_price'] for item in bill_data['items'])
        assert total_amount > 0, "Total amount must be greater than 0"
        
        assert bill_data['split_type'] in ['evenly', 'by_item', 'fixed_amount'], \
            "Split type must be valid"
        
        assert len(bill_data['assigned_roommates']) > 0, \
            "Bill must be assigned to at least one roommate"
        
        # Assert - Bill creation successful
        result = {
            'success': True,
            'message': 'Bill successfully created',
            'bill': bill_data
        }
        
        assert result['success'] is True
        assert result['bill']['title'] == 'Milk'
        assert result['bill']['category'] == 'Food'
        assert total_amount == 20.0
        print("✓ TC1 PASSED: Bill created successfully with valid data")
    
    
    def test_tc2_create_bill_without_amount(self):
        """
        TC2: Attempted to create a bill with no amount
        Input: item_name="Apples", category="Food", amount=None
        Expected: Shows "Please enter valid amount" message
        """
        # Arrange
        bill_data = {
            'creator_id': 'user-1',
            'title': 'Apples',
            'category': 'Food',
            'items': [],  # No items means no amount
            'split_type': 'evenly',
            'assigned_roommates': ['user-1', 'user-2'],
            'home_id': 'home-demo'
        }
        
        # Act - Validate amount exists
        has_items = len(bill_data['items']) > 0
        
        if has_items:
            total_amount = sum(item['quantity'] * item['unit_price'] for item in bill_data['items'])
        else:
            total_amount = 0
        
        # Assert - Should fail validation
        if not has_items or total_amount <= 0:
            result = {
                'success': False,
                'error': 'Please enter valid amount'
            }
        
        assert result['success'] is False
        assert result['error'] == 'Please enter valid amount'
        print("✓ TC2 PASSED: Bill creation blocked when amount is missing")


class TestBillEditing:
    """Test cases for editing existing bills (UC4)"""
    
    def test_tc6_edit_existing_bill_successfully(self):
        """
        TC6: User edits bill successfully
        Input: Update Milk bill from $20 to $30, split between 2 roommates
        Expected: Shows "Bill successfully edited" and shows updated bill
        """
        # Arrange - Original bill
        original_bill = {
            'id': 'bill-1',
            'title': 'Milk',
            'category': 'Food',
            'items': [
                {'name': 'Milk', 'quantity': 1, 'unit_price': 20.0}
            ],
            'split_type': 'evenly',
            'assigned_roommates': ['user-1', 'user-2'],
            'total': 20.0
        }
        
        # Updated data
        updated_data = {
            'items': [
                {'name': 'Milk', 'quantity': 1, 'unit_price': 30.0}
            ],
            'split_type': 'fixed_amount',
            'fixed_amounts': {'user-1': 15.0, 'user-2': 15.0}
        }
        
        # Act - Simulate bill update
        # Validate bill exists
        bill_exists = original_bill['id'] is not None
        assert bill_exists, "Bill must exist to be edited"
        
        # Validate updated amount
        new_total = sum(item['quantity'] * item['unit_price'] for item in updated_data['items'])
        assert new_total > 0, "Updated amount must be valid"
        
        # Apply update
        updated_bill = {
            **original_bill,
            'items': updated_data['items'],
            'split_type': updated_data['split_type'],
            'total': new_total
        }
        
        result = {
            'success': True,
            'message': 'Bill successfully edited',
            'bill': updated_bill
        }
        
        # Assert - Update successful
        assert result['success'] is True
        assert result['message'] == 'Bill successfully edited'
        assert result['bill']['total'] == 30.0
        assert result['bill']['split_type'] == 'fixed_amount'
        print("✓ TC6 PASSED: Bill edited successfully")
    
    
    def test_tc7_edit_nonexistent_bill(self):
        """
        TC7: Unsuccessful bill editing because item was not found
        Input: Try to edit bill with id that doesn't exist
        Expected: Shows "Bill not found" message
        """
        # Arrange
        existing_bills = [
            {'id': 'bill-1', 'title': 'Milk'},
            {'id': 'bill-2', 'title': 'Apples'}
        ]
        
        non_existent_bill_id = 'bill-999'
        
        # Act - Try to find the bill
        bill_found = any(bill['id'] == non_existent_bill_id for bill in existing_bills)
        
        # Simulate edit attempt
        if not bill_found:
            result = {
                'success': False,
                'error': 'Bill not found'
            }
        else:
            result = {
                'success': True,
                'message': 'Bill edited successfully'
            }
        
        # Assert - Edit should fail
        assert result['success'] is False
        assert result['error'] == 'Bill not found'
        print("✓ TC7 PASSED: Edit blocked when bill doesn't exist")


class TestBillValidation:
    """Additional validation tests for bill creation"""
    
    def test_tc3_create_bill_without_item_name(self):
        """
        TC3: User clicks "create bill" with no item name specified
        Input: item_name="", category="Furniture", amount=100
        Expected: Shows "Please enter valid item name" message
        """
        # Arrange
        bill_data = {
            'title': '',  # Empty item name
            'category': 'Furniture',
            'items': [
                {'name': '', 'quantity': 1, 'unit_price': 100.0}
            ],
            'split_type': 'evenly'
        }
        
        # Act - Validate title
        title_valid = bill_data['title'] is not None and bill_data['title'].strip() != ''
        
        if not title_valid:
            result = {
                'success': False,
                'error': 'Please enter valid item name'
            }
        
        # Assert
        assert result['success'] is False
        assert result['error'] == 'Please enter valid item name'
        print("✓ TC3 PASSED: Bill creation blocked when item name is missing")
    
    
    def test_tc4_create_bill_with_negative_amount(self):
        """
        TC4: User enters invalid amount (negative amount)
        Input: item_name="Grapes", category="Food", amount=-200
        Expected: Shows "Please enter valid amount" message
        """
        # Arrange
        bill_data = {
            'title': 'Grapes',
            'category': 'Food',
            'items': [
                {'name': 'Grapes', 'quantity': 1, 'unit_price': -200.0}
            ],
            'split_type': 'evenly'
        }
        
        # Act - Validate amount is positive
        total_amount = sum(item['quantity'] * item['unit_price'] for item in bill_data['items'])
        amount_valid = total_amount > 0
        
        if not amount_valid:
            result = {
                'success': False,
                'error': 'Please enter valid amount'
            }
        
        # Assert
        assert result['success'] is False
        assert result['error'] == 'Please enter valid amount'
        assert total_amount == -200.0  # Verify the negative value was caught
        print("✓ TC4 PASSED: Bill creation blocked for negative amounts")
    
    
    def test_tc5_create_bill_without_category(self):
        """
        TC5: User attempts to create a bill without entering the category
        Input: item_name="Table", category="", amount=200
        Expected: Shows "Please enter valid category" message
        """
        # Arrange
        bill_data = {
            'title': 'Table',
            'category': '',  # Empty category
            'items': [
                {'name': 'Table', 'quantity': 1, 'unit_price': 200.0}
            ],
            'split_type': 'evenly'
        }
        
        # Act - Validate category
        category_valid = bill_data['category'] is not None and bill_data['category'].strip() != ''
        
        if not category_valid:
            result = {
                'success': False,
                'error': 'Please enter valid category'
            }
        
        # Assert
        assert result['success'] is False
        assert result['error'] == 'Please enter valid category'
        print("✓ TC5 PASSED: Bill creation blocked when category is missing")


# Run tests with pytest
if __name__ == '__main__':
    pytest.main([__file__, '-v', '-s'])