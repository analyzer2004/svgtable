# SVG Table

An SVG Table with sticky columns, rows and many other features.

**For a live demo, see [SVG Table with many features and a live COVID Dashboard demo](https://observablehq.com/@analyzer2004/svgtable).**

<img src="https://github.com/analyzer2004/svgtable/blob/master/images/cover.png" width="768">

# API Reference
## SVGTable
* **SVGTable(svg, [container])** - Constructs a new table with default settings. The container can be a svg or any g element, if it is not specified the container will be the svg itself.
* **defaultColumnWidth(width)** - Sets the default column width and returns this table.
* **cellHeight(height)** - Sets the cell height and returns this table.
* **cellPaddingH(padding)** - Sets the cell padding (left, right) and returns this table.
* **cellPaddingV(padding)** - Sets the cell padding (top, bottom) and returns this table.
* **autoSizeCell(auto)** - Specifies if the table should automatically calculate cell size according to its content and returns this table.
* **fixedColumns(num)** - Sets the number of fixed (sticky) columns and returns this table.
* **fixedRows(num)** - Sets the number of fixed (sticky) rows and returns this table. The number does not include the header row as it is always fixed.
* **extent(extent)** - Sets the extent of the table to the specified bounds and returns this table. The extent bounds are specified as an array *[[x0, y0], [x1, y1]]*, where *x0* is the left side of the extent, *y0* is the top, *x1* is the right and *y1* is the bottom.
* **size(size) ** - Sets the table's dimensions to specified width and height and returns this table. The size is specified as an array *[width, height]*.
* **style(style)** - Overrides the default style and returns this table
  * style.**border** - a boolean value that determines the visibility of the border
  * style.**borderColor** - the color of border
  * style.**textColor** - the color of text
  * style.**background** - the background color of non-sticky cells
  * style.**headerBackground** - the background color of header cells
  * style.**fixedBackground** - the background color of fixed (sticky) cells
  * style.**highlight** - the style of hover effect: ***none, cell or cross***, default is cross
  * style.**highlightBackground** - the background color of highlight
* **heatmap(enabled)** - Enables of disables heatmap map and returns this table
* **heatmapPalette(palette)** - Sets the color palette of heatmap and returns this table. The palette can be an array of colors or a color interpolator.
* **columns(columns)** - Overrides the default settings of columns and returns this table. The columns are specified as an array of column object:
  * column.**name** - the name of column
  * column.**isNumber** - specify if the column is a numeric column
  * column.**format** - the number format of the column
  * column.**width** - the width of the column
* **data(data)** - Sets the data and returns this table
* **render()** - Renders the table using the data specified by data() and returns this table
* **getRowData(index)** - Returns values for all the cells in the specified row
* **getColumnData(index)** - Returns values for all the cells in the specified column
* **onhighlight(e, context)** - Occurs when the mouse pointer enters a cell. The context object contains the cell context:
  * context.**cell**: the highlighted cell object
    * cell.**rowIndex**: the row index of the cell
    * cell.**column**: the column of the cell
    * ~~cell.**columnIndex**: the column index of the cell~~ is now cell.**column.index**
    * cell.**value**: the value of the cell
  * context.**column**: the column object of the cell
  * context.**getRow()**: returns values for all the cells of the column based on highlighted cell
  * context.**getColumn()**: returns value of all the cells of the row based on highlighted cell
* **onclick(e, cell)** - Occurs when clicks a cell.
* **oncontextmenu(e, cell)** - Occurs when right clicks a cell.
* ***ToDo***
  * ~~h-scroll by trackpad / mouse wheel~~
  * ~~heatmap~~
  * reorder columns by drag-n-drop
  * ~~auto columnWidht and cellHeight~~
  * pagination

## Scrollbar
The Scrollbar is an accessory of the SVGTable, it can also be used independently as a general-purpose scrollbar.

* **Scrollbar(svg)** - Constructs a new scrollbar with default settings.
* **vertical(vertical)** - A boolean value sets the orientation of the scrollbar to vertical (which is default) and returns this scrollbar
* **sliderWidth(width)** - Sets the width of the slider and returns this scrollbar
* **sliderLength(length)** - Sets the length of the slider and returns this scrollbar
* **position(x, y, length)** - Sets the position and the length of the scrollbar and return this scrollbar
* **attach()** - Attaches the scrollbar to the svg
* **moveSlider(pos)** - Moves the slider to specific position
* **onscroll(pos, edge, delta)** - Occurs when user moves the slider
  * **pos**: the x or y (depends on the orientation) of the mouse pointer
  * **edge**: the left or top (depends on the orientation) of the slider
  * **delta**: the distance between pointer and the center of the slider
