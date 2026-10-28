const Expense = require("../models/Expense");

exports.getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find();
        res.status(200).json(expenses);
    } catch (error) {
        console.error("Fetch expenses full error:", error);
        res.status(500).json({
            message: "Failed to fetch expenses",
            error: error.message
        });
    }
};

// POST: Create a new expense
exports.createExpense = async (req, res) => {
    try {
        const { title, amount, category, date } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            amount === undefined ||
            amount === null ||
            amount === "" ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) < 0 ||
            typeof category !== "string" ||
            !category.trim()
        ) {
            return res.status(400).json({
                message: "Enter a title, valid amount, and category."
            });
        }

        const expense = await Expense.create({
            title: title.trim(),
            amount: Number(amount),
            category: category.trim(),
            ...(date ? { date } : {})
        });

        res.status(201).json({
            message: "Expense added successfully",
            expense
        });
    } catch (error) {
        console.error("Create expense error:", error.message);
        res.status(500).json({
            message: "Failed to add expense"
        });
    }
};

// PUT: Update an existing expense
exports.updateExpense = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                message: "Invalid expense ID"
            });
        }

        const { title, amount, category, date } = req.body;

        if (
            typeof title !== "string" ||
            !title.trim() ||
            amount === undefined ||
            amount === null ||
            amount === "" ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) < 0 ||
            typeof category !== "string" ||
            !category.trim()
        ) {
            return res.status(400).json({
                message: "Enter a title, valid amount, and category."
            });
        }

        const updatedExpense = await Expense.findByIdAndUpdate(
            id,
            {
                title: title.trim(),
                amount: Number(amount),
                category: category.trim(),
                ...(date ? { date } : {})
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedExpense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.status(200).json({
            message: "Expense updated successfully",
            expense: updatedExpense
        });
    } catch (error) {
        console.error("Update expense error:", error.message);
        res.status(500).json({
            message: "Failed to update expense"
        });
    }
};

// DELETE: Remove an expense
exports.deleteExpense = async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return res.status(400).json({
                message: "Invalid expense ID"
            });
        }

        const deletedExpense = await Expense.findByIdAndDelete(id);

        if (!deletedExpense) {
            return res.status(404).json({
                message: "Expense not found"
            });
        }

        res.status(200).json({
            message: "Expense deleted successfully"
        });
    } catch (error) {
        console.error("Delete expense error:", error.message);
        res.status(500).json({
            message: "Failed to delete expense"
        });
    }
};
